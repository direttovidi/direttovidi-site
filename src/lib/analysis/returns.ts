type Snapshot = {
    date: string;
    portfolio_value: number;
    contributions: number;
    withdrawals: number;
};

type ReturnResult = {
    date: string;
    monthlyReturn?: number;
    quarterlyReturn?: number;
    annualReturn?: number;
    withdrawalRate: number;
    portfolioValue: number;
    annualWithdrawal?: number;
    annualWithdrawalRate?: number;
};

function dateKey(date: string): string {
    // Convert date string to YYYY-MM-DD format for consistent keying
    const d = new Date(date);
    return d.toISOString().split('T')[0];
}

function isQuarterEnd(date: Date) {
    //Month values in JavaScript Date are 0-indexed, so we add 1
    const month = date.getMonth() + 1;
    return [3, 6, 9, 12].includes(month);
}

function isYearEnd(date: Date) {
    //Month values in JavaScript Date are 0-indexed, so we add 1
    const month = date.getMonth() + 1;
    return month === 12;
}

type QuarterlySummary = {
    date: string;
    netAdjustment: number;
    portfolioValue: number;
};

type QuarterlyReturn = {
    date: string;
    return: number;
    netAdjustment: number;
    portfolioValue: number;
}

export function summarizeByQuarter(snapshots: Snapshot[]): { [key: string]: QuarterlySummary } {
    const result = {} as { [key: string]: QuarterlySummary };

    let contribSum = 0;
    let withdrawSum = 0;

    for (let i = 0; i < snapshots.length; i++) {
        const snapshot = snapshots[i];
        const date = new Date(snapshot.date);

        contribSum += snapshot.contributions;
        withdrawSum += snapshot.withdrawals;

        if (isQuarterEnd(date)) {
            result[dateKey(snapshot.date)] = {
                date: snapshot.date,
                netAdjustment: contribSum - withdrawSum,
                portfolioValue: snapshot.portfolio_value,
            };

            // Reset for next quarter
            contribSum = 0;
            withdrawSum = 0;
        }
    }

    return result;
}

function getPreviousQuarterEnd(dateStr: string): string {
    const date = new Date(dateStr);
    const month = date.getMonth(); // 0-based
    const year = date.getFullYear();

    let prevQuarterMonth: number;
    let prevQuarterYear = year;

    if (month >= 0 && month <= 2) {
        // Current Q1 → previous Q4 of previous year
        prevQuarterMonth = 11; // December
        prevQuarterYear = year - 1;
    } else if (month >= 3 && month <= 5) {
        // Q2 → Q1
        prevQuarterMonth = 2; // March
    } else if (month >= 6 && month <= 8) {
        // Q3 → Q2
        prevQuarterMonth = 5; // June
    } else {
        // Q4 → Q3
        prevQuarterMonth = 8; // September
    }

    const endOfMonth = new Date(prevQuarterYear, prevQuarterMonth + 1, 0); // last day of prevQuarterMonth
    return endOfMonth.toISOString().split("T")[0];
}

function getPreviousYearDate(dateStr: string): string {
    const date = new Date(dateStr);
    date.setFullYear(date.getFullYear() - 1);
    return date.toISOString().split("T")[0];
}

export function calculateReturns(snapshots: Snapshot[]): ReturnResult[] {
    if (snapshots.length === 0) return [];

    const sorted = [...snapshots].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const quarterlySummaries = summarizeByQuarter(sorted);
    console.log("Quarterly summaries:", quarterlySummaries);

    const results: ReturnResult[] = [];
    let annualWithdrawals = 0;
    console.log('First snapshot date:', sorted[0].date);

    const quarterlyReturns: QuarterlyReturn[] = [];
    for (let i = 0; i < sorted.length; i++) {
        const curr = sorted[i];
        const currDate = new Date(curr.date);
        const dateKeyStr = dateKey(curr.date);

        annualWithdrawals += Number(curr.withdrawals);

        const withdrawalRate = Number(curr.portfolio_value) > 0
            ? Number(curr.withdrawals) / Number(curr.portfolio_value)
            : 0;

        const entry: ReturnResult = {
            date: curr.date,
            withdrawalRate,
            portfolioValue: curr.portfolio_value,
        };

        // Monthly return
        if (i > 0) {

            const prev = sorted[i - 1];
            const prevDate = new Date(prev.date);
            const delta = (currDate.getFullYear() - prevDate.getFullYear()) * 12 + (currDate.getMonth() - prevDate.getMonth());

            if (delta === 1) {
                const gain = curr.portfolio_value - prev.portfolio_value - curr.contributions + curr.withdrawals;
                const base = prev.portfolio_value + curr.contributions - curr.withdrawals;
                entry.monthlyReturn = base !== 0 ? gain / base : 0;
                console.log(`Monthly return for ${curr.date}:`, entry.monthlyReturn);
            }
        }

        const currQuarterEntry = quarterlySummaries[dateKeyStr];
        const prevQuarterEnd = getPreviousQuarterEnd(dateKey(curr.date));
        const prevQuarterEntry = quarterlySummaries[prevQuarterEnd];

        // Quarterly return
        if (currQuarterEntry !== undefined && prevQuarterEntry !== undefined) {
            const gain = currQuarterEntry.portfolioValue - prevQuarterEntry.portfolioValue - currQuarterEntry.netAdjustment;
            const base = prevQuarterEntry.portfolioValue;
            entry.quarterlyReturn = base !== 0 ? gain / base : 0;
            console.log(`Quarterly return for ${curr.date}:`, entry.quarterlyReturn);
            quarterlyReturns.push({
                date: curr.date,
                return: entry.quarterlyReturn,
                portfolioValue: curr.portfolio_value,
                netAdjustment: currQuarterEntry.netAdjustment,
            });
        }

        // Annual return
        if (quarterlyReturns.length === 4 && isYearEnd(currDate)) {
            let rReturn = 1.0;
            let annualWithdrawal = 0;
            for (let j = 0; j < quarterlyReturns.length; j++) {
                rReturn = rReturn * (1 + quarterlyReturns[j].return);
                entry.annualReturn = rReturn - 1.0;
                annualWithdrawal += quarterlyReturns[j].netAdjustment;
            }

            // Compute annual withdrawal rate at year-end
            const previousYearDateKey = getPreviousYearDate(dateKey(curr.date));
            const previousYearPortfolioValue = quarterlySummaries[previousYearDateKey]?.portfolioValue || 0;

            entry.annualWithdrawal = annualWithdrawal;
            entry.annualWithdrawalRate =
                previousYearPortfolioValue > 0 ? annualWithdrawal / previousYearPortfolioValue : 0;

            quarterlyReturns.length = 0; // Reset for next year
        }

        results.push(entry);
    }
    return results;
}
