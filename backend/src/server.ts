import { app } from './app.ts';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`E-Learning Course Analytics System backend running on http://0.0.0.0:${PORT}`);
});

