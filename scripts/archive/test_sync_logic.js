
const row = {
    "타임스탬프": "2025. 12. 10 오후 8:32:38",
    "지점을 선택해주세요": "1호점 : 새봄중학교 앞",
    "수강생 이름": "박준수",
    "금": "2호점 2교시(초등저) 11:00~12:20"
};

function parseRow(row) {
    const keys = Object.keys(row);
    const findVal = (terms) => {
        const key = keys.find(k => terms.some(t => k.includes(t)));
        return key ? (row[key] || '').trim() : '';
    };

    const desiredClasses = [];
    const days = ['월', '화', '수', '목', '금'];

    days.forEach(day => {
        const dayKey = keys.find(k => k.trim() === day);
        if (dayKey) {
            const timeVal = row[dayKey];
            if (!timeVal) return;
            const timeMatch = timeVal.match(/(\d{1,2}:\d{2})/);
            if (timeMatch) {
                desiredClasses.push({
                    day: day + '요일',
                    time: timeMatch[1].padStart(5, '0'),
                    cellText: timeVal
                });
            }
        }
    });

    let branch = findVal(['지점을 선택해주세요', '지점']) || '1호점';
    if (branch.includes('1호점')) branch = '1호점';
    else if (branch.includes('2호점')) branch = '2호점';
    else branch = '1호점';

    return {
        enrollment: {
            branch: branch,
            desiredClasses
        }
    };
}

const { enrollment } = parseRow(row);
console.log('--- TEST PARSE ---');
console.log('Main Branch:', enrollment.branch);

for (const cls of enrollment.desiredClasses) {
    let branch = enrollment.branch;
    if (cls.cellText.includes('1호점')) branch = '1호점';
    else if (cls.cellText.includes('2호점')) branch = '2호점';

    console.log(`[${cls.day} ${cls.time}] Text: "${cls.cellText}" -> Resolved Branch: ${branch}`);
}
