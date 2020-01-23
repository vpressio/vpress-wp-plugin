<template>
  <v-responsive>
    <h1>
      <strong>
        Modulo de carga de datos
      </strong>
      versión demo
    </h1>
    <v-container class="config" fluid>
      <v-card class="graph-tools" flat color="#222A32" dark>
        Vpress
      </v-card>
        <v-container class="padding-none" fluid>
            <v-card class="border padding-none graph-options">
              <v-tabs v-model="tab" background-color="#382E82" color="white" dark>
                <v-tab>
                  DATOS
                </v-tab>
                <v-tab>
                  CONFIGURACIÓN
                </v-tab>
                <v-tab>
                  ESTILO
                </v-tab>
              </v-tabs>
              <v-tabs-items v-model="tab">
                <v-tab-item>
                  <v-card class="graph-options-header" outlined>
                    <v-card-title>
                      Módulo de carga
                    </v-card-title>
                  </v-card>
                </v-tab-item>
                <v-tab-item>
                  <v-card class="graph-options-header" outlined dark color="#7972AC">
                    <v-card-title>
                      Arrastra la selección
                    </v-card-title>
                  </v-card>
                </v-tab-item>
                <v-tab-item>
                  <v-card class="graph-options-header" outlined dark color="#7972AC">
                    <v-card-title>
                      Título
                    </v-card-title>
                  </v-card>
                </v-tab-item>
              </v-tabs-items>
            </v-card>
            <v-card class="border padding-y-none flex-end">
              <v-btn class="save-button" outlined>
                Guardar
              </v-btn>
              <v-btn class="download-button" outlined>
                Descargar
              </v-btn>
            </v-card>
        </v-container>
    </v-container>
  </v-responsive>
</template>
<script>
export default {
  name: 'VpressConfig',
  data() {
    return {
      tab:null,
    };
  }
};
</script>
<style>
.padding-y-none{
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.padding-none{
  padding:0 !important;
}

.flex-end{
  display: flex;
  justify-content: flex-end;
}

.save-button{
  margin-top:10px;
  border-radius: 0px !important;
  border-bottom-left-radius: 13px !important;
  border-top-left-radius: 13px !important;
}

.download-button{
  margin-top:10px;
  border-radius: 0px !important;
  border-bottom-right-radius: 13px !important;
  border-top-right-radius: 13px !important;
}

.graph-tools{
  padding: 0 5px;
  background-color: #242C35;
  display:flex;
  border-radius:0px !important;
}
.config{
  display: flex;
}

.graph-options-header{
  border-top-left-radius: 0px !important;
  border-top-right-radius: 0px !important;
}

.graph-options{
  width: 100%;
}
</style>