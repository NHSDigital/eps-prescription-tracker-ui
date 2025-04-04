import {SiteCards} from "@/components/siteCards/SiteCards"

export default function PrescriptionDetailsPage() {
  // Mock data, lifted from the prototype page.
  const prescriber = {
    org: "Fiji surgery (ODS: FI05964)",
    address: "90 YARROW LANE, FINNSBURY, E45 T46",
    contact: "01232 231321",
    prescribedFrom: "England"
  }

  const dispenser = {
    org: "Cohens chemist (ODS: FV519)",
    address: "22 RUE LANE, CHISWICK, KT19 D12",
    contact: "01943 863158"
  }

  const nominatedDispenser = {
    org: "Cohens chemist (ODS: FV519)",
    address: "22 RUE LANE, CHISWICK, KT19 D12",
    contact: "01943 863158"
  }

  return (
    // Temporary holding div to add padding. Not where this will actually be placed.
    <div className={"nhsuk-u-margin-top-2 nhsuk-u-margin-left-2"}>
      <SiteCards
        prescriber={prescriber}
        dispenser={dispenser}
        nominatedDispenser={nominatedDispenser}
      />
    </div>
  )
}
