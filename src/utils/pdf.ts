import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BingoGame } from '../types';

export const exportToPDF = (currentNumbers: number[], pastGames: BingoGame[], themeColor: string = 'rose') => {
  const doc = new jsPDF();
  
  const THEME_COLORS: Record<string, [number, number, number]> = {
    rose: [225, 29, 72],
    blue: [37, 99, 235],
    green: [16, 185, 129],
    purple: [147, 51, 234],
    amber: [245, 158, 11]
  };
  
  const fillColor = THEME_COLORS[themeColor] || THEME_COLORS['rose'];

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
