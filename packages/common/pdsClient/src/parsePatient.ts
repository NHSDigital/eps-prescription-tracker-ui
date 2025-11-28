import {NOT_AVAILABLE, PatientSummary} from "@cpt-ui-common/common-types"
import {PatientAddress, PatientAddressUse} from "./schema/address"
import {PatientName, PatientNameUse} from "./schema/name"
import {UnrestrictedPatient} from "./schema/patient"
import {closestIndexTo, isFuture, isPast} from "date-fns"

/* Parse Patient FHIR resource */
export const parsePatient = (patient: UnrestrictedPatient): PatientSummary => {
  /* Get the most appropriate values from a list of possible ones with potentially differing uses and/or periods */
  const name = getMostAppropriateValue<PatientName>(
    patient.name, {main: PatientNameUse.USUAL, temp: PatientNameUse.TEMP})
  const address = getMostAppropriateValue<PatientAddress>(
    patient.address, {main: PatientAddressUse.HOME, temp: PatientAddressUse.TEMP})

  /* Return values or "n/a" if not available or empty on the pds record */
  return {
    nhsNumber: patient.id,
    gender: patient?.gender ? patient.gender : NOT_AVAILABLE,
    dateOfBirth: patient?.birthDate ? patient.birthDate : NOT_AVAILABLE,
    givenName: name?.given?.length ? name.given : NOT_AVAILABLE,
    familyName: name?.family ? name.family : NOT_AVAILABLE,
    address: address?.line?.length ? address.line : NOT_AVAILABLE,
    postcode: address?.postalCode ? address.postalCode: NOT_AVAILABLE
  }
}

/* Gets the correct active Name/Address, using the following rules:
  - Active Temp trumps active Home/Usual
  - If there are multiple possible active details, chose the one with the most recent start date
  - If there are no active addresses but a number of future dated ones, choose the one with the closest start date
  - If there are multiple possible active details but none have any dates, chose the first
*/
interface UseKeys {
  main: PatientAddressUse.HOME | PatientNameUse.USUAL
  temp: PatientAddressUse.TEMP | PatientNameUse.TEMP
}

interface GroupedValues<T> {
  active: {
    main: {
      withPeriod: Array<T>
      withoutPeriod: Array<T>
    },
    temp:{
      withPeriod: Array<T>
      withoutPeriod: Array<T>
    }
  }
  past: {
    main: Array<T>
    temp: Array<T>
  }
  future: {
    main: Array<T>
    temp: Array<T>
  }
}

const getMostAppropriateValue = <T extends PatientAddress | PatientName>(
  values: Array<T> | undefined, useKeys: UseKeys): T | undefined => {
  if (!values){
    return
  }

  const groupedValues: GroupedValues<T> = groupValues<T>(values, useKeys)

  // First deal with actives ----------------------------------------------------------------------
  // if any active temps with a period then return the one with the closest start date
  if (groupedValues.active.temp.withPeriod.length){
    return getClosestToNow<T>(groupedValues.active.temp.withPeriod, PeriodKey.START)
  }

  // else if any active home/usuals with a period then return the one with the closest start date
  if (groupedValues.active.main.withPeriod.length){
    return getClosestToNow<T>(groupedValues.active.main.withPeriod, PeriodKey.START)
  }

  // else if any active temps without a period then return the first
  if (groupedValues.active.temp.withoutPeriod.length){
    return groupedValues.active.temp.withoutPeriod[0]
  }

  // else if any active home/usuals without a period then return the first
  if (groupedValues.active.main.withoutPeriod.length){
    return groupedValues.active.main.withoutPeriod[0]
  }

  // Else deal with future dated  ----------------------------------------------------------------------
  // values grouped as future dated will always contain at least a start date
  let closestFutureMain, closestFutureTemp

  // if any future dated home/usuals then get the one with the closest start date
  if (groupedValues.future.main.length) {
    closestFutureMain = getClosestToNow<T>(groupedValues.future.main, PeriodKey.START)
  }

  // if any future dated temps then get the one with the closest start date
  if (groupedValues.future.temp.length){
    closestFutureTemp = getClosestToNow<T>(groupedValues.future.temp, PeriodKey.START)
  }

  // if any future dated values
  if (closestFutureMain || closestFutureTemp) {
    // if the closest home/usual and temp values have an equally close start date then return the temp
    if (closestFutureMain?.period?.start === closestFutureTemp?.period?.start){
      return closestFutureTemp
    }

    // else return the value with the closest start date from the closest home/usual and closest temp
    return getClosestToNow([
      ...(closestFutureMain ? [closestFutureMain] : []),
      ...(closestFutureTemp ? [closestFutureTemp] : [])
    ], PeriodKey.START)
  }

  // Else deal with past dated -------------------------------------------------------------------------
  // values grouped as past dated will always contain a start and end date
  let closestPastMain, closestPastTemp

  // if any past dated home/usuals the get the one with the closest end date
  if (groupedValues.past.main.length) {
    closestPastMain = getClosestToNow<T>(groupedValues.past.main, PeriodKey.END)
  }

  // if any past dated temps then get the one with the closest end date
  if (groupedValues.past.temp.length) {
    closestPastTemp = getClosestToNow<T>(groupedValues.past.temp, PeriodKey.END)
  }

  // if any past dated values
  if (closestPastMain || closestPastTemp) {
    // if the closest home/usual and temp values have an equally close end date then return the temp
    if (closestPastMain?.period?.end === closestPastTemp?.period?.end) {
      return closestPastTemp
    }

    // else return the value with the closest end date from the closest home/usual and closest temp
    return getClosestToNow<T>([
      ...(closestPastMain ? [closestPastMain] : []),
      ...(closestPastTemp ? [closestPastTemp] : [])
    ], PeriodKey.END)
  }
}

const groupValues = <T extends PatientAddress | PatientName>(values: Array<T>, useKeys: UseKeys): GroupedValues<T> => {
  const groupedValues: GroupedValues<T> = {
    active: {
      main: {
        withPeriod: [],
        withoutPeriod: []
      },
      temp: {
        withPeriod: [],
        withoutPeriod: []
      }
    },
    past: {
      main: [],
      temp: []
    },
    future: {
      main: [],
      temp: []
    }
  }

  // Group values by timing(Past/Present(Active)/Future) and use
  for (const value of values){
    // If not Home/Usual or Temp then ignore
    if (!(value.use === useKeys.main || value.use === useKeys.temp)){
      continue
    }
    const use = value.use === useKeys.main ? "main" : "temp"

    // If it has no period, class as active
    if (!value.period){
      groupedValues.active[use].withoutPeriod.push(value)
    }

    //If the period start date is in the past
    if (value.period && isPast(value.period.start)){
      // and it has no end date, class as active
      if (!value.period.end){
        groupedValues.active[use].withPeriod.push(value)
      }
      // and it has an end date in the future, class as active
      if (value.period.end && isFuture(value.period.end)){
        groupedValues.active[use].withPeriod.push(value)
      }
      // and it has an end date in the past, class as past
      if (value.period.end && isPast(value.period.end)){
        groupedValues.past[use].push(value)
      }
    }

    // If period start date is in the future, class as future
    if (value.period && isFuture(value.period.start)){
      groupedValues.future[use].push(value)
    }
  }

  return groupedValues
}

enum PeriodKey {
  START = "start",
  END = "end"
}
const getClosestToNow = <T extends PatientAddress | PatientName>(
  values: Array<T>, periodKey: PeriodKey): T => {
  const now = Date.now()

  // get list of start/end dates to compare
  const datesToCompare = values.map((value: T) => value.period?.[periodKey] as string)
  // get the index of the date closest to now
  const closestDateIndex = closestIndexTo(now, datesToCompare) as number

  // return value with the most recent start date
  return values[closestDateIndex]
}
