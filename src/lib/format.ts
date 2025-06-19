export function formatCurrency(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return "$0.00";

    const number = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(number)) return "$0.00";

    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
    }).format(number);
}
