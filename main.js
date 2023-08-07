const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { PDFDocument } = require('pdf-lib');

let mainWindow;

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    mainWindow.loadFile('index.html');
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.executeJavaScript(`
      const { ipcRenderer } = require('electron');
      window.ipcRenderer = ipcRenderer;
    `);
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.handle('select-files', async (event, options) => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, options);
        return result.filePaths;
    } catch (error) {
        return `Error selecting files: ${error.message}`;
    }
});

ipcMain.handle('insert-pdf', async (event, inputPdfPath, insertPdfPath, insertPageNumber) => {
    try {
        const outputPdfPath = 'output.pdf';

        const inputPdfBytes = await fs.readFile(inputPdfPath);
        const insertPdfBytes = await fs.readFile(insertPdfPath);
    
        const pdfDoc = await PDFDocument.create();
        const inputPdf = await PDFDocument.load(inputPdfBytes);
        const insertPdf = await PDFDocument.load(insertPdfBytes);
    
        const inputPages = await pdfDoc.copyPages(inputPdf, inputPdf.getPageIndices());
        const insertPage = await pdfDoc.copyPages(insertPdf, [0]);
    
        for (const page of inputPages) {
            pdfDoc.addPage(page);
        }
    
        insertPage[0].drawPage(inputPages[insertPageNumber - 1]);
    
        pdfDoc.addPage(insertPage[0]);
    
        const pdfBytes = await pdfDoc.save();
        await fs.writeFile(outputPdfPath, pdfBytes);
    
        return `PDF insertion complete. Output file saved at: ${outputPdfPath}`;        
    } catch (error) {
        return `Error inserting PDF: ${error.message}`;
    }
   
});
