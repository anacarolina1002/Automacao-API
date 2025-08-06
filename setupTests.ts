import pactum from 'pactum';
import { StatusCodes } from 'http-status-codes';

const URL_BASE = 'http://127.0.0.1/api';
const MAX_TENTATIVAS = 3000;
const INTERVALO = 29000;

jest.setTimeout(5 * 60 * 1000);

async function esperarAPI(): Promise<void> {
  console.log('Aguardando API subir...');

  let tentativas = 0;
  while (tentativas < MAX_TENTATIVAS) {
    try {
      await pactum.spec()
        .get(`${URL_BASE}/health`)
        .expectStatus(StatusCodes.OK);

      console.log('✅ API disponível! Iniciando testes...');
      return;
    } catch (error) {
      console.log(`🔄 Tentativa ${tentativas + 1} de ${MAX_TENTATIVAS}...`);
    }
    await new Promise(resolve => setTimeout(resolve, INTERVALO));
    tentativas++;
  }

  throw new Error('🚨 API não ficou disponível dentro do tempo limite!');
}

beforeAll(async () => {
  await esperarAPI();
});
