import {NOT_AVAILABLE, PatientSummary} from "@cpt-ui-common/common-types"
import {PatientAddress, PatientAddressUse} from "./schema/address"
import {PatientName, PatientNameUse} from "./schema/name"
import {UnrestrictedPatient} from "./schema/patient"
import {closestIndexTo, isFuture, isPast} from "date-fns"

export const parsePatient = (patient: UnrestrictedPatient): PatientSummary => {
  return {
    nhsNumber: patient.id,
    gender: patient.gender ?? NOT_AVAILABLE,
    dateOfBirth: patient.birthDate ?? NOT_AVAILABLE
  }
}

interface UseKeys {
  main: PatientAddressUse.HOME | PatientNameUse.USUAL
  temp: PatientAddressUse.TEMP | PatientNameUse.TEMP
}

/* Gets the correct active Name/Address, using the following rules:
  - Active Temp trumps active Home/Usual
  - If there are multiple possible active details, chose the one with the most recent start date
  - If there are no active addresses but a number of future dated ones, choose the one with the closest start date
  - If there are multiple possible active details but none have any dates, chose the first
*/
interface GroupedValues<T> {
  active: {
    main: {
      withPeriod: Array<T>,
      withoutPeriod: Array<T>
    },
    temp:{
      withPeriod: Array<T>,
      withoutPeriod: Array<T>
    }
  }
  past: Array<T>
  future: Array<T>
}

// TODO: temp export, should be internal to parse
export const getActive = <T extends PatientAddress | PatientName>(
  values: Array<T>, useKeys: UseKeys): T | undefined => {
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
    past: [],
    future: []
  }

  // TODO: spin this out to its own fun for cleanliness
  // Group stuff ----------------------------------------------------------------------
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
        groupedValues.past.push(value)
      }
    }

    // If period start date is in the future, class as future
    if (value.period && isFuture(value.period.start)){
      groupedValues.future.push(value)
    }
  }

  // Deal with actives ----------------------------------------------------------------------
  // if active temps with periods return the one with the closest start date
  if (groupedValues.active.temp.withPeriod.length){
    return getClosestToNow<T>(groupedValues.active.temp.withPeriod, PeriodKey.START)
  }

  // else if active home/usuals with periods return the one with the closest start date
  if (groupedValues.active.main.withPeriod.length){
    return getClosestToNow<T>(groupedValues.active.main.withPeriod, PeriodKey.START)
  }

  // else if active temps without periods return the first
  if (groupedValues.active.temp.withoutPeriod.length){
    return groupedValues.active.temp.withoutPeriod[0]
  }

  // else if active home/usuals without periods return the first
  if (groupedValues.active.main.withoutPeriod.length){
    return groupedValues.active.main.withoutPeriod[0]
  }

  // Deal with future dated  ----------------------------------------------------------------------
  // return the temp or home/usual with the closest start date
  if (groupedValues.future.length){
    return getClosestToNow<T>(groupedValues.future, PeriodKey.START)
  }

  // Deal with past dates -------------------------------------------------------------------------
  // return the temp or home/usual with the closest end date
  if(groupedValues.past.length){
    return getClosestToNow<T>(groupedValues.past, PeriodKey.END)
  }

}

enum PeriodKey {
  START = "start",
  END = "end"
}
const getClosestToNow = <T extends PatientAddress | PatientName>(
  values: Array<T>, periodKey: PeriodKey): T => {
  const now = Date.now()

  // get list of start dates to compare
  const startDates = values.map((value: T) => value.period?.[periodKey] as string)
  // get the index of the date closest to now
  const closestStartDateIndex = closestIndexTo(now, startDates) as number

  // return value with the most recent start date
  return values[closestStartDateIndex]
}
