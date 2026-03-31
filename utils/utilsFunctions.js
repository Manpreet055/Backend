const capitalizeFirstLetter = (str) => {
  if (!str || typeof str !== "string") return;
  return str.charAt(0).toUpperCase() + str.slice(1);
};
export default capitalizeFirstLetter;

export const getPreviousMonthRange = () => {
  const now = new Date();
  const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayPrevMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
  );

  return { firstDayPrevMonth, lastDayPrevMonth };
};
