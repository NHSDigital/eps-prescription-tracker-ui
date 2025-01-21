import React from 'react';
import "@testing-library/jest-dom";
import { fireEvent, render } from "@testing-library/react";
import { Tabs } from "nhsuk-react-components";
import EpsTabs from '@/components/EpsTabs';
import PrescriptionIdSearch from "@/components/prescriptionSearch/PrescriptionIdSearch"
import NhsNumSearch from '@/components/prescriptionSearch/NhsNumSearch';
import BasicDetailsSearch from '@/components/prescriptionSearch/BasicDetailsSearch';
import {
  PRESCRIPTION_SEARCH_TABS
} from "@/constants/ui-strings/SearchTabStrings"

describe('The tabs component', () => {

  
  it('Switches the visibility of tabs when clicked', () => {
    const tabData = PRESCRIPTION_SEARCH_TABS;
    const { container } = render(  
      <EpsTabs/>
    );

    const firstTabLink = container.querySelector('#tab_PrescriptionIdSearch');
    const secondTabLink = container.querySelector('#tab_NhsNumSearch');

    expect(
      firstTabLink?.parentElement?.classList.contains('nhsuk-tabs__list-item--selected'),
    ).toEqual(true);
    expect(
      secondTabLink?.parentElement?.classList.contains('nhsuk-tabs__list-item--selected'),
    ).toEqual(false);

    fireEvent.click(secondTabLink);

    expect(
      firstTabLink?.parentElement?.classList.contains('nhsuk-tabs__list-item--selected'),
    ).toEqual(false);
    expect(
      secondTabLink?.parentElement?.classList.contains('nhsuk-tabs__list-item--selected'),
    ).toEqual(true);
  });
  describe('The tab list', () => {
    it('Renders the expected children', () => {
      const { container } = render(
        <Tabs.List>
          <div id="list-contents" />
        </Tabs.List>,
      );

      const listElement = container.querySelector('.nhsuk-tabs__list');

      expect(listElement?.querySelector('#list-contents')).toBeTruthy();
    });
  });

  describe('The tab list item', () => {
    it('Sets the href to be the passed in id prop', () => {
      const { container } = render(
        <Tabs.ListItem id="test-id">
          <div id="list-item-contents" />
        </Tabs.ListItem>,
      );

      expect(container.querySelector('.nhsuk-tabs__tab')?.getAttribute('href')).toBe('#test-id');
    });

    it('Renders the expected children', () => {
      const { container } = render(
        <Tabs.ListItem id="test-id">
          <div id="list-item-contents" />
        </Tabs.ListItem>,
      );

      const tabElement = container.querySelector('.nhsuk-tabs__tab');

      expect(tabElement?.querySelector('#list-item-contents')).toBeTruthy();
    });
  });

  describe('The tab contents', () => {
    it('Renders the expected children', () => {
      const { container } = render(
        <Tabs.Contents id="test-contents">
          <div id="tab-contents" />
        </Tabs.Contents>,
      );

      const tabElement = container.querySelector('#test-contents');

      expect(tabElement?.querySelector('#tab-contents')).toBeTruthy();
    });
  });
});
