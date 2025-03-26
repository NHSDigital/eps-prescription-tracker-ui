import React from 'react'
import { Tabs } from "nhsuk-react-components";

import PrescriptionsList from "@/components/prescriptionList/PrescriptionsList"

import {
    CURRENT_PRESCRIPTIONS,
    FUTURE_PRESCRIPTIONS,
    PAST_PRESCRIPTIONS,
    PRESCRIPTION_LIST_TABS
} from "@/constants/ui-strings/PrescriptionListTabStrings";
import { PrescriptionSummary } from '@cpt-ui-common/common-types';

export interface PrescriptionsListTabsProps {
    currentPrescriptions: PrescriptionSummary[],
    pastPrescriptions: PrescriptionSummary[],
    futurePrescriptions: PrescriptionSummary[]
}

export default function PrescriptionsListTabs({
    currentPrescriptions,
    pastPrescriptions,
    futurePrescriptions
}: PrescriptionsListTabsProps) {
    const tabData = PRESCRIPTION_LIST_TABS;

    return (
        <Tabs defaultValue={tabData[0].targetId}>
            <Tabs.Title>Contents</Tabs.Title>
            <Tabs.List>
                {
                    tabData.map(tabHeader =>
                        <Tabs.ListItem id={tabHeader.targetId} key={tabHeader.title}>{tabHeader.title}</Tabs.ListItem>
                    )
                }
            </Tabs.List>
            {
                tabData.map(tabContent =>
                    <Tabs.Contents id={tabContent.targetId} key={tabContent.title}>
                        <div className='search-form-container'>
                            {
                                (tabContent.targetId === 'current' && <PrescriptionsList
                                    textContent={CURRENT_PRESCRIPTIONS}
                                    prescriptions={currentPrescriptions}
                                />) ||
                                (tabContent.targetId === 'future' && <PrescriptionsList
                                    textContent={FUTURE_PRESCRIPTIONS}
                                    prescriptions={futurePrescriptions}
                                />) ||
                                (tabContent.targetId === 'past' && <PrescriptionsList
                                    textContent={PAST_PRESCRIPTIONS}
                                    prescriptions={pastPrescriptions}
                                />) ||
                                <p>This Search not available</p>
                            }
                        </div>

                    </Tabs.Contents>
                )
            }
        </Tabs>
    )
}
