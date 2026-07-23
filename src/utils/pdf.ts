import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bingochamonix } from '../types';

export const exportToPDF = (currentNumbers: number[], pastGames: Bingochamonix[], themeColor: string = 'rose') => {
  const doc = new jsPDF();
  
  const THEME_COLORS: Record<string, [number, number, number]> = {
    rose: [225, 29, 72],
    blue: [37, 99, 235],
    green: [16, 185, 129],
    purple: [147, 51, 234],
    amber: [245, 158, 11],
    red: [239, 68, 68],
    orange: [249, 115, 22],
    yellow: [234, 179, 8],
    teal: [20, 184, 166],
    cyan: [6, 182, 212],
    indigo: [99, 102, 241],
    pink: [236, 72, 153]
  };
  
  let fillColor: [number, number, number] = THEME_COLORS['rose'];
  
  if (themeColor.startsWith('#')) {
    const r = parseInt(themeColor.slice(1, 3), 16);
    const g = parseInt(themeColor.slice(3, 5), 16);
    const b = parseInt(themeColor.slice(5, 7), 16);
    fillColor = [r, g, b];
  } else if (THEME_COLORS[themeColor]) {
    fillColor = THEME_COLORS[themeColor];
  }

  doc.setFontSize(18);
  doc.text('Historique Bingo', 14, 22);

  let startY = 30;

  if (currentNumbers.length > 0) {
    doc.setFontSize(14);
    doc.text('Partie en cours', 14, startY);
    startY += 8;

    doc.setFontSize(10);
    const text = currentNumbers.join(' - ');
    const splitText = doc.splitTextToSize(text, 180);
    doc.text(splitText, 14, startY);
    startY += (splitText.length * 6) + 10;
  }

  if (pastGames.length > 0) {
    doc.setFontSize(14);
    doc.text('Parties précédentes', 14, startY);
    startY += 6;

    const tableData = pastGames.map((game) => [
      new Date(game.timestamp).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }),
      game.numbers.length.toString(),
      game.numbers.join(', '),
    ]);

    autoTable(doc, {
      head: [['Date', 'Tirages', 'Séquence']],
      body: tableData,
      startY: startY,
      styles: { fontSize: 8 },
      headStyles: { fillColor },
    });
  }

  doc.save('historique-bingo.pdf');
};
