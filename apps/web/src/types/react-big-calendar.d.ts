declare module "react-big-calendar" {
  import * as React from "react";

  export interface Event {
    id: string;
    title: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    resource?: unknown;
  }

  export interface CalendarProps<T extends Event = Event> {
    localizer: { localizer: unknown };
    events: T[];
    startAccessor: string;
    endAccessor: string;
    style?: React.CSSProperties;
    view?: string;
    onView?: (view: string) => void;
    date?: Date;
    onNavigate?: (date: Date) => void;
    eventPropGetter?: (event: T) => { style: React.CSSProperties };
    popup?: boolean;
    selectable?: boolean;
    tooltipAccessor?: (event: T) => string;
  }

  export const Calendar: React.FC<CalendarProps>;
  export const dayjsLocalizer: (dayjs: unknown) => { localizer: unknown };
  export const Views: {
    MONTH: string;
    WEEK: string;
    DAY: string;
  };
}
