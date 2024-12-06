'use client'
import React from 'react'
import "../assets/styles/tabs.scss"
import { Tabs } from "nhsuk-react-components";
import PrescriptionIdSearch from "./prescriptionSearch/PrescriptionIdSearch"
import NhsNumSearch from './prescriptionSearch/NhsNumSearch';
import BasicDetailsSearch from './prescriptionSearch/BasicDetailsSearch';
import {
    PRESCRIPTION_SEARCH_TABS
} from "../constants/ui-strings/SearchTabStrings";

export default function EpsTabs() {
    const tabData = PRESCRIPTION_SEARCH_TABS;
    return (
        <Tabs>
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
