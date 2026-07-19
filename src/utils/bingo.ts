export const drawBingoNumber = (drawn: number[], max = 90): number | null => {
  if (drawn.length >= max) return null;
  
  let num;
  do {
    num = Math.floor(Math.random() * max) + 1;
  } while (drawn.includes(num));
  
  return num;
};
