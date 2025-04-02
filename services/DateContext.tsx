import React, { createContext, useState, useEffect, ReactNode } from "react";

type DateContextType = {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
};

export const DateContext = createContext<DateContextType>({
  selectedDate: "",
  setSelectedDate: () => {},
});

type DateProviderProps = {
  children: ReactNode;
};

function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

export function DateProvider({ children }: DateProviderProps) {
  const [selectedDate, setSelectedDateState] = useState(getTodayDateString());

  function setSelectedDate(date: string) {
    setSelectedDateState(date);
  }

  return <DateContext.Provider value={{ selectedDate, setSelectedDate }}>{children}</DateContext.Provider>;
}
