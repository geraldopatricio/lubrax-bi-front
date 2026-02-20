<template>
  <div class="dashboard-wrapper">
    <!-- Container do Iframe -->
    <div class="iframe-container">
      <iframe title="BI Frotas Lubrax" width="1024" height="1060" 
        src="https://app.powerbi.com/view?r=eyJrIjoiZDQ3Y2RhZDAtNThhOS00ODFhLTg0YzgtODAwYTMzZGQ4Y2Q3IiwidCI6ImEzYTY5ODI1LTA2YTMtNDU0Ny1iZGZkLTBlYWI3MDJmMTcyNiJ9" 
        frameborder="0" allowFullScreen="true">
      </iframe>
    </div>
  </div>
</template>

<script setup>
// Como é apenas a exibição de um iframe, não é necessário lógica complexa de script.
</script>

<style scoped>
/* Remove margens e garante que o fundo combine com o resto do app */
.dashboard-wrapper {
  width: 100%;
  height: calc(100vh - 20px); /* Ajuste o valor se houver um header no seu app */
  padding: 15px;
  background-color: #f8fafc;
  display: flex;
  flex-direction: column;
}

/* Deixa o iframe responsivo e preenchendo o espaço disponível */
.iframe-container {
  flex-grow: 1;
  width: 100%;
  height: 100%;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>