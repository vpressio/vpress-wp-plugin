<template>
<v-container>
    <v-row justify="center">
      <v-col class="header" cols=12>
        <h1 class='font-merri'>
          "Segunda reunión de donantes"
        </h1>
        <p class="report-date">16 JULIO 2020</p>
      </v-col>
      <v-col cols=8 class="font-merri mb-5">  
        <p>
          <span class="antecedent-span">Antecedente:</span> A los donantes se les pidió identificar fases en las que ven su participación.
          Encuentro de donantes interesados en la Península de Yucatán.
        </p>
        <p>
          ¿Cómo podemos responder de una manera más inteligente y articulada en las diferentes crisis que enfrentamos?
        </p>
        <p>
          Coordinación con las fundaciones para poder apoyar o financiar.
        </p>
        <p>
          ¿Cómo podemos hacer operativa la cooperación?
        </p>
        <p>
          ¿Cuáles son las caras que esta coordinación puede tener?
        </p>
        <p>
          ¿Cómo se ve un marco de acción compartido?
        </p>
      </v-col>
      <v-col cols=8 class="objectives">
        <h5 class="mb-3">
          CONECTAR
        </h5>
        <ul class="mb-3">
          <li> Conectar por temática, Conectar por geografía, Conectar por tipo de acción</li>
          <li> Conocer dónde estamos actuando</li>
          <li> Activar la colaboración</li>
          <li> Conectar por temática, Conectar por geografía, Conectar por tipo de acción</li>
        </ul>
        <h5 class="mb-3">IDENTIFICAR</h5>
          <ul class="mb-3">
            <li>¿Cuáles don los retos operativos, administrativos, actuales que retrasan la respuesta en campo?</li>
            <li>¿Identificación de las brechas?</li>
            <li>¿Qué ha funcionado o no en procesos con donantes?</li>
            <li>¿Cuáles son las formas de colaboración y participación en redes?</li>
          </ul>
        <h5 class="mb-3">ENCAMINAR</h5>
        <ul class="mb-3">
          <li>Enriquecer el mapa con los socios en la región para considerarlos como voces para el diálogo con actores de base.</li>
          <li>Invitar a organización de donantes a participar en el proceso de organización de diálogo</li>
        </ul>
      </v-col>
      <v-col cols=8 class="chart-col">
        <h5 class="instruction">
          SELECCIONA <br> UNO  O MÁS <br> TEMAS
        </h5>
        <v-btn class="subject-btn" text>
          Presupuesto
        </v-btn>
        <v-btn class="subject-btn" text>
          Actores locales
        </v-btn>
        <v-btn class="subject-btn" text>
          Donantes
        </v-btn>
        <v-btn class="subject-btn" text>
          Cobertura
        </v-btn>
      </v-col>
      <v-col cols=8 class="chart-col-2">
        <div>
          <v-btn>
            Tema
          </v-btn>
          <v-btn>
            Geográfico
          </v-btn>
          <div class="">

          </div>
        </div>
        <VpressChartContainer :data="data" :chartConfig="chartConfig"/>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import VpressChartContainer from '../components/vpress-chart-container'

export default {
  name: 'reunionDonantes',
  components: {
    VpressChartContainer
  },
  data() {
    return {
      data: [],
      chartConfig: {  
        chart: 'bars',
        xAxis: { title: '', type: '', slug: 'tema', func: '' },
        yAxis: { title: '', type: '', slug: 'presupuesto', func: '' },
        groupBy: { title: '', type: '', slug: '' },
        collapseBy: { title: '', type: '', slug: 'monto', func: '' },
        filters: [],
        orderBy: { order: 'asc', slug: '' },
        unitsName: '',
        decimals: 0,
        preffix: '',
        suffix: '',
        stackedBars: false,
        title: '',
        subtitle: '',
        opacity: 1,
        theme: '',
        labels: true,
        colors: ['#40348c', '#842f8e', '#ba2982', '#e2346d', '#fc5353', '#ff7b33', '#ffa600']
      }
    }
  }
}
</script>
<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap');
.header {
  display: flex;
  justify-content: center;
  flex-direction: column;
  text-align: center;
}

.font-merri {
  font-family: Merriweather;
}

.antecedent-span {
  font-weight: 900;
}
.report-date {
  font-weight: 700;
  font-size: 0.8rem;
}

.chart-col {
  border-top: dashed 1px;
  margin-top: 50px;
  display: flex;
}

.chart-col-2 {
  display:flex;
}

.instruction {
  border-right: solid;
  padding-right: 40px;
  margin-right: 50px;
}

.subject-btn {
  border-bottom: 3px solid transparent;
  padding: 0 !important;
  margin: 0 20px 0 0;
  font-size: 0.9rem;
  letter-spacing: 0.7px;
}

</style>
