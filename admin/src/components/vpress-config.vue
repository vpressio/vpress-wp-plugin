<template>
  <v-responsive>
    <h1>
      <strong>
        Modulo de carga de datos
      </strong>
      versión demo
    </h1>
    <v-container class="config" fluid>
      <v-card class="graph-tools" flat color="#222A32" width="50"  dark>
        <v-card class="pa-2" height="48" color="#181D25" flat>
          <v-img src="../assets/images/logo.svg"></v-img>
        </v-card>
      </v-card>
      <v-card class="graph-sidebar" flat color="transparent">
        <v-card class="padding-none graph-options border-radius-none">
          <v-tabs class="config-tabs" v-model="tab" background-color="#382E82" color="white" dark>
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
              <v-card class="border-radius-none" outlined>
                <v-card-title>
                  Módulo de carga
                </v-card-title>
              </v-card>
            </v-tab-item>
            <v-tab-item>
              <v-card class="border-radius-none" flat>
                <v-expansion-panels  multiple flat tile hover dark>
                  <v-expansion-panel class="config-panels">
                    <v-expansion-panel-header style="background-color:#7972AC">
                      ARRASTRA LA SELECCIÓN
                    </v-expansion-panel-header>
                    <v-expansion-panel-content>
                      <v-card class="border-radius-none" flat light>
                        config-panelss
                      </v-card>
                    </v-expansion-panel-content>
                  </v-expansion-panel>
                </v-expansion-panels>
              </v-card>
            </v-tab-item>
            <v-tab-item>
              <v-card class="border-radius-none" flat dark color="#7972AC">
                <v-expansion-panels  multiple flat tile hover dark>
                  <v-expansion-panel class="config-panels">
                    <v-expansion-panel-header style="background-color:#7972AC">
                      TÍTULO
                    </v-expansion-panel-header>
                    <v-expansion-panel-content>
                      <v-card class="border-radius-none" flat light>
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
                    </v-expansion-panel-content>
                  </v-expansion-panel>
                </v-expansion-panels>
              </v-card>
            </v-tab-item>
          </v-tabs-items>
        </v-card>
        <v-card class="padding-y-none graph-display" flat color="transparent">
          <v-card class="flex-end" flat color="transparent">
            <v-btn class="save-button" outlined>
              Guardar
            </v-btn>
            <v-btn class="download-button" outlined>
              Descargar
            </v-btn>
          </v-card>
          <v-card class="graph"> 
            Gráficas
          </v-card>
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
  border-radius:0px !important;
}
.config{
  display: flex;
}

.border-radius-none{
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

.graph {
  margin: 12px 0 0 12px;
  min-height: 350px
}

.config-panels > .v-expansion-panel-header {
  min-height: 0% !important;
  padding: 14px 24px;
  color:#FFFF !important;
  font-weight: 500;
  font-size:  1.1rem !important;
  border-top-left-radius: 0%; 
  border-top-right-radius: 0%;
}

.config-panels > .v-expansion-panel-content > .v-expansion-panel-content__wrap {
  padding: 0;
}

.config-panels {
  margin: 0% !important;
}
</style>
