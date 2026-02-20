<script setup>
import { ref } from 'vue';
import { Search, Send, Mail, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-vue-next';

const API_AUTOMACAO = "https://api.lubzap.lubconsulta.com.br/automacao";

const emailBusca = ref('');
const lojista = ref(null);
const isLoading = ref(false);
const toast = ref({ show: false, msg: '', type: 'success' });

// Estado do Modal de Envio
const showModalProgresso = ref(false);
const statusEnvio = ref('inativo'); // 'processando', 'concluido', 'vazio'
const resumoEnvio = ref({ total: 0, sucesso: 0, erro: 0 });

const mensagemTexto = ref(
`Lembrete [Nome da Loja]

Olá, [Nome do Cliente], tudo bem?

Identificamos que o seu veículo de placa [Placa] está próximo da [Nome do Serviço].

O descuido pode causar desgaste prematuro do motor. Manter a troca em dia garante mais economia e segurança.

Agende agora mesmo o serviço conosco!

[Endereço da Loja]`
);

const showToast = (msg, type) => {
  toast.value = { show: true, msg, type };
  setTimeout(() => toast.value.show = false, 4000);
};

const buscarLojista = async () => {
  if (!emailBusca.value) return;
  isLoading.value = true;
  lojista.value = null;
  try {
    const res = await fetch(`${API_AUTOMACAO}/buscar-usuario?email=${emailBusca.value}`);
    const data = await res.json();
    if (data.userId) {
      lojista.value = data;
      showToast("Lojista localizado!", "success");
    } else {
      showToast("E-mail não encontrado.", "error");
    }
  } catch (e) {
    showToast("Erro ao buscar e-mail.", "error");
  } finally { isLoading.value = false; }
};

const dispararMensagens = async () => {
  if (!lojista.value) return;
  
  // Abrir modal e resetar stats
  showModalProgresso.value = true;
  statusEnvio.value = 'processando';
  resumoEnvio.value = { total: 0, sucesso: 0, erro: 0 };

  try {
    const res = await fetch(`${API_AUTOMACAO}/executar-envio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: lojista.value.userId, mensagem: mensagemTexto.value })
    });
    
    const data = await res.json();
    
    if (data.success) {
      resumoEnvio.value = { 
        total: data.total, 
        sucesso: data.sucesso || 0, 
        erro: data.erro || 0 
      };
      
      if (data.total === 0) {
        statusEnvio.value = 'vazio';
      } else {
        statusEnvio.value = 'concluido';
      }
    } else {
      throw new Error("Erro no servidor");
    }
  } catch (e) {
    showModalProgresso.value = false;
    showToast("Falha técnica ao processar disparos.", "error");
  }
};
</script>

<template>
  <div class="container p-4 position-relative">
    
    <!-- TOAST -->
    <div v-if="toast.show" :class="['toast-custom', toast.type === 'success' ? 'bg-success' : 'bg-danger']">
       {{ toast.msg }}
    </div>

    <h4 class="fw-bold text-dark mb-4">Disparo de Lembretes Automáticos</h4>

    <div class="row g-4">
      <div class="col-md-5">
        <div class="card border-0 shadow-sm p-4">
          <label class="fw-bold mb-2 small text-muted">1. LOCALIZAR POR E-MAIL</label>
          <div class="input-group mb-3">
            <span class="input-group-text bg-light border-end-0"><Mail :size="18"/></span>
            <input type="email" class="form-control border-start-0" v-model="emailBusca" placeholder="E-mail do lojista">
            <button class="btn btn-primary text-white" @click="buscarLojista" :disabled="isLoading">
              <Search v-if="!isLoading" :size="18" />
              <Loader2 v-else class="spinner" :size="18" />
            </button>
          </div>
          
          <div v-if="lojista" class="p-3 bg-orange-subtle rounded border border-orange">
             <div class="small fw-bold text-primary">Lojista Identificado!</div>
             <div class="text-muted x-small">ID: {{ lojista.userId }}</div>
          </div>
        </div>
      </div>

      <div class="col-md-7">
        <div class="card border-0 shadow-sm p-4">
          <label class="fw-bold mb-2 small text-muted">2. EDITAR MENSAGEM</label>
          <textarea class="form-control mb-3" rows="14" v-model="mensagemTexto"></textarea>
          
          <div class="d-flex flex-wrap gap-2 mb-4">
            <code class="small text-primary">[Nome do Cliente]</code>
            <code class="small text-primary">[Placa]</code>
            <code class="small text-primary">[Nome do Serviço]</code>
          </div>

          <button class="btn btn-primary btn-lg w-100 text-white fw-bold" 
            :disabled="!lojista || statusEnvio === 'processando'" @click="dispararMensagens">
            <Send class="me-2" :size="20"/> Executar Disparos de Hoje
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL DE PROGRESSO -->
    <Transition name="fade">
      <div v-if="showModalProgresso" class="modal-overlay">
        <div class="modal-card card border-0 shadow-lg text-center p-5">
          
          <!-- ESTADO: PROCESSANDO -->
          <div v-if="statusEnvio === 'processando'">
            <Loader2 class="spinner text-primary mb-3" :size="48" />
            <h5 class="fw-bold">Processando Envios...</h5>
            <p class="text-muted">Estamos consultando o banco de dados e realizando os disparos via WhatsApp. Por favor, aguarde.</p>
          </div>

          <!-- ESTADO: CONCLUÍDO -->
          <div v-if="statusEnvio === 'concluido'">
            <CheckCircle class="text-success mb-3" :size="48" />
            <h5 class="fw-bold">Disparos Concluídos!</h5>
            <div class="row mt-4">
              <div class="col-4">
                <div class="h3 fw-bold m-0">{{ resumoEnvio.total }}</div>
                <div class="x-small text-muted">ACHADOS</div>
              </div>
              <div class="col-4 border-start">
                <div class="h3 fw-bold text-success m-0">{{ resumoEnvio.sucesso }}</div>
                <div class="x-small text-muted">SUCESSO</div>
              </div>
              <div class="col-4 border-start">
                <div class="h3 fw-bold text-danger m-0">{{ resumoEnvio.erro }}</div>
                <div class="x-small text-muted">ERROS</div>
              </div>
            </div>
            <button class="btn btn-primary mt-5 w-100 py-2 fw-bold" @click="showModalProgresso = false">Fechar Relatório</button>
          </div>

          <!-- ESTADO: VAZIO (NÃO ACHOU MENSAGENS) -->
          <div v-if="statusEnvio === 'vazio'">
            <AlertCircle class="text-warning mb-3" :size="48" />
            <h5 class="fw-bold">Nenhuma Mensagem Hoje</h5>
            <p class="text-muted">Não encontramos nenhum serviço agendado para a data de hoje para este lojista.</p>
            <button class="btn btn-light border mt-4 w-100" @click="showModalProgresso = false">Voltar</button>
          </div>

        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 2000;
}
.modal-card { width: 90%; max-width: 450px; border-radius: 20px; }
.spinner { animation: rotate 1s linear infinite; }
@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.bg-orange-subtle { background-color: #fff7ed; }
.text-primary { color: #f97316 !important; }
.bg-primary { background-color: #f97316 !important; }
.border-orange { border-color: #fdba74 !important; }

.toast-custom { 
  position: fixed; top: 20px; left: 50%; transform: translateX(-50%); 
  padding: 12px 25px; border-radius: 50px; color: white; z-index: 3000; 
  box-shadow: 0 4px 12px rgba(0,0,0,0.2); font-weight: bold;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.x-small { font-size: 0.7rem; }
</style>