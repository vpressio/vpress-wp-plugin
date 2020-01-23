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
        _____
      </v-card>
      <v-card class="graph-sidebar">
        <v-card class="padding-none graph-options graph-options-header">
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
              <v-card class="graph-options-header" flat>
                <v-card class="graph-options-header" flat dark color="#7972AC">
                  <v-card-title>
                    Arrastra la selección
                  </v-card-title>
                </v-card>
                <v-card-text>
                  Arratra la selección
                </v-card-text>
              </v-card>
            </v-tab-item>
            <v-tab-item>
              <v-card flat>
                <v-card class="graph-options-header" flat dark color="#7972AC">
                  <v-card-title>
                    Título
                  </v-card-title>
                </v-card>
                <v-row>
                  <v-col>
                    Título
                  </v-col>
                  <v-col>
                    <v-switch >
                    </v-switch>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col>
                    Título
                  </v-col>
                  <v-col>
                    <v-switch >
                    </v-switch>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col>
                    Título
                  </v-col>
                  <v-col>
                    <v-switch >
                    </v-switch>
                  </v-col>
                </v-row>
              </v-card>
            </v-tab-item>
          </v-tabs-items>
        </v-card>
        <v-card class="padding-y-none flex-end graph-display" flat color="transparent">
          <v-btn class="save-button" outlined>
            Guardar
          </v-btn>
          <v-btn class="download-button" outlined>
            Descargar
          </v-btn>
        </v-card>
      </v-card>
    </v-container>
  </v-responsive>
</template>
<script>
export default {
  name: 'VpressConfig',
  data() {
    return {
      tab: null,
    };
  },
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
  display: flex !important;
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
  border-radius: 0px !important;
}

.graph-options{
  width: fit-content;
}

.graph-sidebar{
  display: flex !important;
  width: inherit;
}
.graph-display{
  width: inherit
}

</style>
