import React from 'react';
import "@testing-library/jest-dom";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { Tabs } from "nhsuk-react-components";
import { BrowserRouter } from 'react-router-dom';

import EpsTabs from '@/components/EpsTabs';

import {
  PRESCRIPTION_SEARCH_TABS
} from "@/constants/ui-strings/SearchTabStrings";

// Move MediaQueryList mock outside
class MediaQueryList {
  matches = false;
  media = '';
  onchange = null;
  addListener = jest.fn();
  removeListener = jest.fn();
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
  dispatchEvent = jest.fn();

  constructor() {
    this.matches = false;
    this.media = '';
  }
}

window.matchMedia = jest.fn().mockImplementation(() => new MediaQueryList());

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(function () {
  return {
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  };
});

describe('The tabs component', () => {
  it('Switches the visibility of panels when tabs are clicked', async () => {
    const { container } = render(
      // Wrap with BrowserRouter to provide the routing context
      <BrowserRouter>
        <div className="nhsuk-tabs">
          <EpsTabs />
        </div>
      </BrowserRouter>
    );

    // Get the panels
    const firstPanel = container.querySelector('#PrescriptionIdSearch');
    const secondPanel = container.querySelector('#NhsNumSearch');

    // Get the tab links
    const firstTabLink = container.querySelector('a[href="#PrescriptionIdSearch"]');
    const secondTabLink = container.querySelector('a[href="#NhsNumSearch"]');

    if (!firstTabLink || !secondTabLink || !firstPanel || !secondPanel) {
      throw new Error('Tab elements not found');
    }

    // First panel should be visible initially
    expect(firstPanel).toHaveClass('nhsuk-tabs__panel');
    expect(secondPanel).toHaveClass('nhsuk-tabs__panel');

    // Click second tab
    fireEvent.click(secondTabLink);

    await waitFor(() => {
      expect(firstPanel).toHaveClass('nhsuk-tabs__panel');
      expect(secondPanel).toHaveClass('nhsuk-tabs__panel');
    });

    // Click first tab
    fireEvent.click(firstTabLink);

    await waitFor(() => {
      expect(firstPanel).toHaveClass('nhsuk-tabs__panel');
      expect(secondPanel).toHaveClass('nhsuk-tabs__panel');
    });
  });

  // Rest of the tests remain the same...
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
