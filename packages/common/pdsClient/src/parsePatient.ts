import {
  NOT_AVAILABLE,
  PatientAddressUse,
  PatientNameUse,
  PatientSummary
} from "@cpt-ui-common/common-types"
import {closestIndexTo, isFuture, isPast} from "date-fns"
import {PatientAddress} from "./schema/address"
import {PatientName} from "./schema/name"
import {UnrestrictedPatient} from "./schema/patient"

/* Parse Patient FHIR resource */
export const parsePatient = (patient: UnrestrictedPatient): PatientSummary => {
  /* Get the most appropriate values from a list of possible ones with potentially differing uses and/or periods */
  const name = getMostAppropriateValue<PatientName>(
    patient.name, {main: PatientNameUse.USUAL, temp: PatientNameUse.TEMP})
  const address = getMostAppropriateValue<PatientAddress>(
    patient.address, {main: PatientAddressUse.HOME, temp: PatientAddressUse.TEMP})
  /* Filter any potential empty strings from the address lines so that we can return a cleaner address in the response,
   but mostly so that we return a proper n/a response for address if all the lines are empty strings for some reason */
  const addressLines = address?.line?.filter(Boolean)

  /* Return values or "n/a" if not available or empty on the pds record */
  return {
    nhsNumber: patient.id,
    gender: patient?.gender ? patient.gender : NOT_AVAILABLE,
    dateOfBirth: patient?.birthDate ? patient.birthDate : NOT_AVAILABLE,
    givenName: name?.given?.length ? name.given : NOT_AVAILABLE,
    familyName: name?.family ? name.family : NOT_AVAILABLE,
    nameUse: name?.use ? name.use: NOT_AVAILABLE,
    address: addressLines?.length ? addressLines : NOT_AVAILABLE,
    postcode: address?.postalCode ? address.postalCode : NOT_AVAILABLE,
    addressUse: address?.use ? address.use : NOT_AVAILABLE
  }
}

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

/* Gets the most appropriate Name or Address using the following rules:
  - Active/Current values are any with no period, or have a start date in the past and no end date,
    or an end date in the future
  - Future dated values are any with a start date in the future
  - Past dated values are any with both a start and end date in the past
  - If there are any active/current values choose from these first
    - If there are any temp values with a period, choose the one with the closest start date
    - Else if there are any home/usual values with a period, choose the one with the closest start date
    - Else if there are any temp values without a period chose the first
    - Else choose the first home/usual value without a period
  - Else if there are any future dated values, choose from these
    - If the temp value with the closest start and the home value with the closest start date have an equally close
      start date, then choose the temp value
    - Else choose the value temp or home/usual that has the closest start date
  - Else if there are any past dated values, choose from these
    - If the temp value with the closest end date and the home value with the closest end date have an equally close
      end date, then choose the temp value
    - Else choose the value temp or home/usual that has the closest start date
*/
const getMostAppropriateValue = <T extends PatientAddress | PatientName>(
  values: Array<T> | undefined, useKeys: UseKeys): T | undefined => {
  if (!values){
    return
  }

  /* group values by period & use */
  const groupedValues: GroupedValues<T> = groupValues<T>(values, useKeys)

  /* -- First deal with any active/current values ------------------------------------------------------------------- */
  /* if there are any active temp values with a period, then return the one with the closest start date */
  if (groupedValues.active.temp.withPeriod.length){
    return getClosestToNow<T>(groupedValues.active.temp.withPeriod, PeriodKey.START)
  }

  /* else if there are any active home/usual values with a period, then return the one with the closest start date */
  if (groupedValues.active.main.withPeriod.length){
    return getClosestToNow<T>(groupedValues.active.main.withPeriod, PeriodKey.START)
  }

  /* else if there are any active temp values without a period, then return the first */
  if (groupedValues.active.temp.withoutPeriod.length){
    return groupedValues.active.temp.withoutPeriod[0]
  }

  // else if there are any active home/usual values without a period, then return the first
  if (groupedValues.active.main.withoutPeriod.length){
    return groupedValues.active.main.withoutPeriod[0]
  }

  /* -- Next deal with any future dated values -----------------------------------------------------------------------*/
  /* values grouped as future dated will always contain at least a start date */
  let closestFutureMain, closestFutureTemp

  /* if there are any future dated home/usual values, then get the one with the closest start date */
  if (groupedValues.future.main.length) {
    closestFutureMain = getClosestToNow<T>(groupedValues.future.main, PeriodKey.START)
  }

  /* if there are any future dated temp values, then get the one with the closest start date */
  if (groupedValues.future.temp.length){
    closestFutureTemp = getClosestToNow<T>(groupedValues.future.temp, PeriodKey.START)
  }

  /* if there are any future dated values */
  if (closestFutureMain || closestFutureTemp) {
    /* if the closest home/usual and temp values have an equally close start date, then return the temp */
    if (closestFutureMain?.period?.start === closestFutureTemp?.period?.start){
      return closestFutureTemp
    }

    /* else return the value with the closest start date from the closest home/usual and closest temp */
    return getClosestToNow([
      ...(closestFutureMain ? [closestFutureMain] : []),
      ...(closestFutureTemp ? [closestFutureTemp] : [])
    ], PeriodKey.START)
  }

  /* -- Finally deal with any past dated values --------------------------------------------------------------------- */
  /* values grouped as past dated will always contain a start and end date */
  let closestPastMain, closestPastTemp

  /* if there are any past dated home/usual values, then get the one with the closest end date */
  if (groupedValues.past.main.length) {
    closestPastMain = getClosestToNow<T>(groupedValues.past.main, PeriodKey.END)
  }

  /* if there are any past dated temp values, then get the one with the closest end date */
  if (groupedValues.past.temp.length) {
    closestPastTemp = getClosestToNow<T>(groupedValues.past.temp, PeriodKey.END)
  }

  /* if there are any past dated values */
  if (closestPastMain || closestPastTemp) {
    /* if the closest home/usual and temp values have an equally close end date, then return the temp */
    if (closestPastMain?.period?.end === closestPastTemp?.period?.end) {
      return closestPastTemp
    }

    /* else return the value with the closest end date from the closest home/usual and closest temp */
    return getClosestToNow<T>([
      ...(closestPastMain ? [closestPastMain] : []),
      ...(closestPastTemp ? [closestPastTemp] : [])
    ], PeriodKey.END)
  }
}

/* Groups values by timing and use */
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

  for (const value of values){
    /* If the values use is not Home/Usual or Temp then ignore it */
    if (!(value.use === useKeys.main || value.use === useKeys.temp)){
      continue
    }
    const use = value.use === useKeys.main ? "main" : "temp"

    /* If the value has no period, then group it as active */
    if (!value.period){
      groupedValues.active[use].withoutPeriod.push(value)
    }

    /* If the values period start date is in the past */
    if (value.period && isPast(value.period.start)){
      /* and if it has no end date, then group it as active */
      if (!value.period.end){
        groupedValues.active[use].withPeriod.push(value)
      }
      /* else if it has an end date in the future, then group it as active */
      if (value.period.end && isFuture(value.period.end)){
        groupedValues.active[use].withPeriod.push(value)
      }
      /* else if it has an end date in the past, then group it as past dated */
      if (value.period.end && isPast(value.period.end)){
        groupedValues.past[use].push(value)
      }
    }

    /* If the values period start date is in the future, then group it as future dated */
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

  /* get a list of start/end dates to compare */
  const datesToCompare = values.map((value: T) => value.period?.[periodKey] as string)
  /* get the index of the date closest to now */
  const closestDateIndex = closestIndexTo(now, datesToCompare) as number

  /* return the value with the most recent start date */
  return values[closestDateIndex]
}
