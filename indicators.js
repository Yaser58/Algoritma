function calcRMA(data, length) {
    const rma = new Array(data.length).fill(null);
    let sum = 0, count = 0;
    for (let i = 0; i < data.length; i++) {
        if (data[i] !== null) {
            if (count < length) {
                sum += data[i];
                count++;
                if (count === length) rma[i] = sum / length;
            } else {
                rma[i] = (data[i] + rma[i - 1] * (length - 1)) / length;
            }
        }
    }
    return rma;
}

function calcRSI(data, length) {
    const changes = data.map((v, i) => i === 0 ? null : v - data[i - 1]);
    const ups = changes.map(v => v === null ? null : Math.max(v, 0));
    const downs = changes.map(v => v === null ? null : Math.max(-v, 0));
    const rmaUp = calcRMA(ups, length);
    const rmaDown = calcRMA(downs, length);
    return rmaUp.map((up, i) => {
        const down = rmaDown[i];
        if (up === null || down === null) return null;
        return down === 0 ? 100 : 100 - (100 / (1 + up / down));
    });
}

function kReg(data, h, a) {
    const y = new Array(data.length).fill(null);
    const wArr = [];
    for(let j=0; j<=150; j++) wArr.push(Math.pow(1+j*j/(2*a*h*h), -a));
    for (let i = 25; i < data.length; i++) {
        let sw = 0, sy = 0;
        const maxJ = Math.min(i, 150);
        for (let j = 0; j <= maxJ; j++) {
            const w = wArr[j];
            sw += w; sy += data[i - j] * w;
        }
        y[i] = sy / sw;
    }
    return y;
}

function calcEMA(data, length) {
    const ema = new Array(data.length).fill(null);
    if (data.length < length) return ema;
    const k = 2 / (length + 1);
    let sma = 0;
    for (let i = 0; i < length; i++) sma += data[i];
    ema[length - 1] = sma / length;
    for (let i = length; i < data.length; i++) {
        ema[i] = (data[i] - ema[i - 1]) * k + ema[i - 1];
    }
    return ema;
}

function calcATR(data, length) {
    const tr = data.map((c, i) => {
        if (i === 0) return c.high - c.low;
        return Math.max(c.high - c.low, Math.abs(c.high - data[i-1].close), Math.abs(c.low - data[i-1].close));
    });
    const rma = new Array(tr.length).fill(null);
    let sum = 0;
    for (let i = 0; i < tr.length; i++) {
        if (i < length) {
            sum += tr[i];
            if (i === length - 1) rma[i] = sum / length;
        } else {
            rma[i] = (tr[i] + rma[i-1] * (length - 1)) / length;
        }
    }
    return rma;
}
