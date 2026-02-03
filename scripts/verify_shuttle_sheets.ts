
import { GoogleSheetService } from '../src/lib/googleSheet';

async function verifySheets() {
    const service = new GoogleSheetService();

    console.log('--- Verifying Shuttle Sheets ---');

    const tabs = ['1차차량운행', '2차차량운행'];

    for (const tab of tabs) {
        console.log(`\nChecking Tab: [${tab}]`);
        try {
            const rows = await service.fetchRawData(tab);
            if (rows.length === 0) {
                console.log(`[WARNING] Tab ${tab} is empty.`);
                continue;
            }

            // Headers are usually the first row of "raw" data if fetchRawData returns objects
            // But fetchRawData returns objects keyed by header.
            // Let's print the keys of the first row to verify headers.
            const headers = Object.keys(rows[0]);
            console.log(`Headers: ${headers.join(', ')}`);
            console.log(`Row Count: ${rows.length}`);

            // Print first 3 rows to check specific data
            console.log('Sample Data (First 3 rows):');
            rows.slice(0, 3).forEach((r: any, i: number) => {
                console.log(`Row ${i + 1}:`, JSON.stringify(r, null, 2));
            });

        } catch (e: any) {
            console.error(`Error fetching ${tab}:`, e.message);
        }
    }
}

verifySheets();
