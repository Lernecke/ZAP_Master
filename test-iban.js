function calculateMod97(iban) {
    const rearranged = iban.substring(4) + iban.substring(0, 4);
    const numeric = rearranged.split('').map(c => {
        const code = c.charCodeAt(0);
        return (code >= 65 && code <= 90) ? (code - 55).toString() : c;
    }).join('');
    
    let remainder = numeric;
    while (remainder.length > 2) {
        const block = remainder.slice(0, 9);
        remainder = (parseInt(block, 10) % 97) + remainder.slice(block.length);
    }
    return parseInt(remainder, 10) === 1;
}

function generateSwissIBAN(iid) {
    const account = "000000000001";
    let bban = iid + account;
    
    let tempIban = "CH00" + bban;
    const rearranged = tempIban.substring(4) + tempIban.substring(0, 4);
    const numeric = rearranged.split('').map(c => {
        const code = c.charCodeAt(0);
        return (code >= 65 && code <= 90) ? (code - 55).toString() : c;
    }).join('');
    
    let remainder = numeric;
    while (remainder.length > 2) {
        const block = remainder.slice(0, 9);
        remainder = (parseInt(block, 10) % 97) + remainder.slice(block.length);
    }
    
    const checkDigits = (98 - parseInt(remainder, 10)).toString().padStart(2, '0');
    return "CH" + checkDigits + bban;
}

const iban1 = generateSwissIBAN("31000"); // QR-IBAN
const iban2 = generateSwissIBAN("09000"); // Standard IBAN
console.log(iban1);
console.log(iban2);
