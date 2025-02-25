import React from 'react'
import { Tabs } from "nhsuk-react-components";
import PrescriptionIdSearch from "@/components/prescriptionSearch/PrescriptionIdSearch"
import NhsNumSearch from '@/components/prescriptionSearch/NhsNumSearch';
import BasicDetailsSearch from '@/components/prescriptionSearch/BasicDetailsSearch';
import {
    PRESCRIPTION_SEARCH_TABS
} from "@/constants/ui-strings/SearchTabStrings";

export default function EpsTabs() {
    const tabData = PRESCRIPTION_SEARCH_TABS;
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
                        <div>
                            {(tabContent.targetId === 'PrescriptionIdSearch' && <PrescriptionIdSearch />) ||
                                (tabContent.targetId === 'NhsNumSearch' && <NhsNumSearch />) ||
                                (tabContent.targetId === 'BasicDetailsSearch' && <BasicDetailsSearch />) ||
                                <p>This Search not available</p>
                            }
                        </div>

                    </Tabs.Contents>
                )
            }
        </Tabs>
    )
}
