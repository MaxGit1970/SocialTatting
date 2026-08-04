# Tatting Studio

Editor visuale e grammaticale per progettare schemi di chiacchierino.

## Avvio

Tatting Studio è un'applicazione Vite: **non aprire `index.html` direttamente** con un doppio clic. Il protocollo `file://` non consente al browser di caricare i moduli JavaScript dell'app e produce un errore CORS.

### Windows — avvio rapido

Dopo aver installato [Node.js](https://nodejs.org/), apri la cartella principale del progetto (la stessa che contiene `package.json`) e fai doppio clic su:

```text
AVVIA-TATTING-STUDIO.bat
```

È disponibile anche il nome alternativo `start-tatting-studio.bat`. Entrambi i file si trovano nella **cartella principale**, non dentro `src`.

Lo script installa le dipendenze quando necessario, avvia il server e apre automaticamente il browser.

### Terminale

Dalla cartella del progetto esegui:

```bash
npm install
npm start
```

Apri quindi l'indirizzo indicato da Vite, normalmente <http://localhost:5173>.

## Build di produzione

```bash
npm run build
npm run preview
```

La preview sarà disponibile all'indirizzo comunicato da Vite. Anche la build deve essere servita tramite HTTP e non aperta direttamente dal filesystem.
