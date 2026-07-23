const VERSION = 5;
const SIZE = VERSION * 4 + 17;
const DATA_CODEWORDS = 108;
const EC_CODEWORDS = 26;
const FORMAT_XOR = 0x5412;
const FORMAT_GENERATOR = 0x537;

function gfMultiply(left: number, right: number) {
  let product = 0;
  for (let value = left, factor = right; factor > 0; factor >>>= 1) {
    if ((factor & 1) !== 0) product ^= value;
    value <<= 1;
    if ((value & 0x100) !== 0) value ^= 0x11d;
  }
  return product;
}

function gfPow(power: number) {
  let value = 1;
  for (let index = 0; index < power; index += 1) value = gfMultiply(value, 2);
  return value;
}

function multiplyPolynomials(left: number[], right: number[]) {
  const result = Array.from({ length: left.length + right.length - 1 }, () => 0);
  for (let i = 0; i < left.length; i += 1) {
    for (let j = 0; j < right.length; j += 1) {
      result[i + j] = (result[i + j] ?? 0) ^ gfMultiply(left[i] ?? 0, right[j] ?? 0);
    }
  }
  return result;
}

function reedSolomonGenerator(degree: number) {
  let result = [1];
  for (let index = 0; index < degree; index += 1) result = multiplyPolynomials(result, [1, gfPow(index)]);
  return result;
}

function reedSolomonRemainder(data: number[]) {
  const generator = reedSolomonGenerator(EC_CODEWORDS);
  const result = Array.from({ length: EC_CODEWORDS }, () => 0);
  for (const byte of data) {
    const factor = byte ^ (result.shift() ?? 0);
    result.push(0);
    for (let index = 0; index < EC_CODEWORDS; index += 1) result[index] = (result[index] ?? 0) ^ gfMultiply(generator[index + 1] ?? 0, factor);
  }
  return result;
}

function appendBits(bits: number[], value: number, length: number) {
  for (let index = length - 1; index >= 0; index -= 1) bits.push((value >>> index) & 1);
}

function makeDataCodewords(value: string) {
  const bytes = [...new TextEncoder().encode(value)];
  if (bytes.length > DATA_CODEWORDS - 2) throw new Error("Join URL is too long for the QR code.");
  const bits: number[] = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, 8);
  for (const byte of bytes) appendBits(bits, byte, 8);
  appendBits(bits, 0, Math.min(4, DATA_CODEWORDS * 8 - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords: number[] = [];
  for (let index = 0; index < bits.length; index += 8) {
    codewords.push(bits.slice(index, index + 8).reduce((value, bit) => (value << 1) | bit, 0));
  }
  for (let pad = 0xec; codewords.length < DATA_CODEWORDS; pad = pad === 0xec ? 0x11 : 0xec) codewords.push(pad);
  return codewords;
}

function formatBits(mask: number) {
  const data = (0b01 << 3) | mask;
  let bits = data << 10;
  for (let index = 14; index >= 10; index -= 1) {
    if (((bits >>> index) & 1) !== 0) bits ^= FORMAT_GENERATOR << (index - 10);
  }
  return ((data << 10) | (bits & 0x3ff)) ^ FORMAT_XOR;
}

function getBit(value: number, index: number) {
  return ((value >>> index) & 1) !== 0;
}

function createMatrix(value: string) {
  const modules: boolean[][] = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => false));
  const reserved: boolean[][] = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => false));

  function setFunction(row: number, col: number, dark: boolean) {
    if (row < 0 || col < 0 || row >= SIZE || col >= SIZE) return;
    const moduleRow = modules[row];
    const reservedRow = reserved[row];
    if (!moduleRow || !reservedRow) return;
    moduleRow[col] = dark;
    reservedRow[col] = true;
  }

  function drawFinder(row: number, col: number) {
    for (let y = -1; y <= 7; y += 1) {
      for (let x = -1; x <= 7; x += 1) {
        const yy = row + y;
        const xx = col + x;
        const inPattern = x >= 0 && x <= 6 && y >= 0 && y <= 6;
        const dark = inPattern && (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4));
        setFunction(yy, xx, dark);
      }
    }
  }

  function drawAlignment(row: number, col: number) {
    for (let y = -2; y <= 2; y += 1) {
      for (let x = -2; x <= 2; x += 1) {
        setFunction(row + y, col + x, Math.max(Math.abs(x), Math.abs(y)) === 2 || (x === 0 && y === 0));
      }
    }
  }

  function drawFormat(mask: number) {
    const bits = formatBits(mask);
    for (let index = 0; index <= 5; index += 1) setFunction(8, index, getBit(bits, index));
    setFunction(8, 7, getBit(bits, 6));
    setFunction(8, 8, getBit(bits, 7));
    setFunction(7, 8, getBit(bits, 8));
    for (let index = 9; index < 15; index += 1) setFunction(14 - index, 8, getBit(bits, index));
    for (let index = 0; index < 8; index += 1) setFunction(SIZE - 1 - index, 8, getBit(bits, index));
    for (let index = 8; index < 15; index += 1) setFunction(8, SIZE - 15 + index, getBit(bits, index));
    setFunction(SIZE - 8, 8, true);
  }

  drawFinder(0, 0);
  drawFinder(0, SIZE - 7);
  drawFinder(SIZE - 7, 0);
  drawAlignment(30, 30);
  for (let index = 8; index < SIZE - 8; index += 1) {
    const dark = index % 2 === 0;
    setFunction(6, index, dark);
    setFunction(index, 6, dark);
  }
  drawFormat(0);

  const codewords = makeDataCodewords(value);
  const allCodewords = [...codewords, ...reedSolomonRemainder(codewords)];
  const dataBits = allCodewords.flatMap((codeword) => Array.from({ length: 8 }, (_, index) => (codeword >>> (7 - index)) & 1));

  let bitIndex = 0;
  let upward = true;
  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;
    for (let vertical = 0; vertical < SIZE; vertical += 1) {
      const row = upward ? SIZE - 1 - vertical : vertical;
      for (let columnOffset = 0; columnOffset < 2; columnOffset += 1) {
        const col = right - columnOffset;
        if (reserved[row]?.[col]) continue;
        let dark = (dataBits[bitIndex] ?? 0) === 1;
        if ((row + col) % 2 === 0) dark = !dark;
        const moduleRow = modules[row];
        if (moduleRow) moduleRow[col] = dark;
        bitIndex += 1;
      }
    }
    upward = !upward;
  }
  return modules;
}

export function QrCode({ value, label }: { value: string; label: string }) {
  let modules: boolean[][];
  try {
    modules = createMatrix(value);
  } catch {
    modules = createMatrix("/join");
  }
  const quietZone = 4;
  const viewBoxSize = SIZE + quietZone * 2;
  return (
    <svg className="qr-code" role="img" aria-label={label} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} shapeRendering="crispEdges">
      <rect width={viewBoxSize} height={viewBoxSize} fill="#f7f2e8" />
      {modules.map((row, rowIndex) =>
        row.map((dark, colIndex) => (dark ? <rect key={`${rowIndex}-${colIndex}`} x={colIndex + quietZone} y={rowIndex + quietZone} width="1" height="1" fill="#050507" /> : null))
      )}
    </svg>
  );
}
