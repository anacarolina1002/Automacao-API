import { execFile, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

function restaurarBanco(): void {
  const logPath = path.join(__dirname, 'log_pg_restore.txt');

  try {
    console.log('🔄 Removendo banco de dados existente...');

    execSync(`psql -U postgres -h 127.0.0.1 -p 5433 -d postgres -c "DROP DATABASE IF EXISTS qa;"`, { stdio: 'inherit' });
    execSync(`psql -U postgres -h 127.0.0.1 -p 5433 -d postgres -c "CREATE DATABASE qa;"`, { stdio: 'inherit' });

    console.log('✅ Banco qa recriado com sucesso.');
  } catch (erro) {
    console.error('❌ Erro ao dropar/criar o banco qa:', erro);
    return;
  }

  const comando = 'pg_restore';
  const argumentos = [
    '--no-owner',
    '--verbose',
    '--host', '127.0.0.1',
    '--port', '5433',
    '--username', 'postgres',
    '--dbname', 'qa',
    '.\\backup\\base_api.backup'
  ];

  const processo = execFile(comando, argumentos, { maxBuffer: 1024 * 1024 * 10 }, (erro, stdout, stderr) => {
    const conteudoLog = `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`;
    fs.writeFileSync(logPath, conteudoLog, 'utf8');

    if (erro) {
      console.error('❌ Erro ao restaurar o banco. Verifique o log em log_pg_restore.txt');
    } else {
      console.log('✅ Banco restaurado com sucesso!');
      executarMigrationsAcimaDe653();
    }
  });

  if (processo.stdout) {
    processo.stdout.on('data', data => {
      console.log(data.toString());
    });
  }
  if (processo.stderr) {
    processo.stderr.on('data', data => {
      console.error(data.toString());
    });
  }
}

function executarMigrationsAcimaDe653(): void {
  const pastaSQL = 'C:\\Ema Software\\Contas ERP\\SQL';
  const arquivos = fs.readdirSync(pastaSQL);

  const arquivosFiltrados = arquivos
    .filter(nome => nome.endsWith('.pgs') && /^SQL\d{5}/.test(nome))
    .filter(nome => {
      const numero = parseInt(nome.match(/\d{5}/)?.[0] || '0', 10);
      return numero >= 653;
    })
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d{5}/)?.[0] || '0', 10);
      const numB = parseInt(b.match(/\d{5}/)?.[0] || '0', 10);
      return numA - numB;
    });

  console.log(`📄 Executando ${arquivosFiltrados.length} migrations a partir da 653...`);

  arquivosFiltrados.forEach(nome => {
    const caminhoOriginal = path.join(pastaSQL, nome);
    const conteudoOriginal = fs.readFileSync(caminhoOriginal, 'utf8');
    const conteudoConvertido = conteudoOriginal.replace(/\^/g, ';');

    // Criar arquivo temporário
    const caminhoTemp = path.join(os.tmpdir(), `temp_${nome.replace('.pgs', '.sql')}`);
    fs.writeFileSync(caminhoTemp, conteudoConvertido, 'utf8');

    try {
      console.log(`🚀 Executando: ${nome}`);
      execSync(`psql -U postgres -h 127.0.0.1 -p 5433 -d qa -f "${caminhoTemp}"`, { stdio: 'inherit' });
    } catch (erro) {
      console.error(`❌ Erro ao executar ${nome}:`, erro);
    } finally {
      fs.unlinkSync(caminhoTemp); // Apagar o arquivo temporário
    }
  });

  console.log('✅ Execução das migrations finalizada.');
}

restaurarBanco();
