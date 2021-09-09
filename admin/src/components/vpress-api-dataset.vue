<template>
  <v-row justify="center">
    <v-col
      cols="12"
      sm="10"
      md="8"
      lg="6"
    >
      <v-card
        class="pa-5"
        hover
        flat
        height="800"
      >
        <v-card-title>
          Registrar Dataset
        </v-card-title>
        <v-text-field
          v-model="datasetName"
          label="Nombre Dataset"
          placeholder="Nombre de tu dataset"
          outlined
          dense
        ></v-text-field>
        <v-autocomplete
          v-model="datasetAPI"
          :items="extAPIItems"
          item-text="name"
          item-value="id"
          label="API"
          placeholder="API Registrada"
          dense
          outlined
        ></v-autocomplete>
        <v-text-field
          v-model="datasetSlug"
          label="Nombre Tabla"
          placeholder="nombre_tabla"
          outlined
          dense
        ></v-text-field>
        <v-btn
          class="my-5"
          rounded
          color="primary"
          max-width="180"
          height="50"
          @click="handleAddDataset"
        >
          Registrar
        </v-btn>
        <v-dialog v-model="loading" persistent width="300">
          <v-card color="primary" dark>
            <v-card-text>
              <v-card-title class="px-0 text-subtitle-1">
                Comprobando datos, por favor espera
              </v-card-title>
              <v-progress-linear
                indeterminate
                color="white"
                class="mb-0"
              ></v-progress-linear>
            </v-card-text>
          </v-card>
        </v-dialog>
      </v-card>
    </v-col>
    <v-col
      cols="12"
      sm="10"
      md="8"
      lg="6"
    >
      <v-card
        class="pa-5"
        hover
        flat
        height="800"
      >
        <v-card-title>
          Registrar API Externa
        </v-card-title>
        <v-text-field
          v-model="apiName"
          :rules="[() => !!apiName || 'Campo requerido']"
          label="Nombre API"
          placeholder="Nombre de tu API"
          outlined
          dense
          required
        ></v-text-field>
        <v-text-field
          v-model="apiPrefix"
          :rules="[() => !!apiPrefix || 'Campo requerido']"
          label="Prefijo API"
          placeholder="https://api.example.org/"
          outlined
          dense
          required
        ></v-text-field>
        <v-text-field
          v-model="apiKey"
          label="API Key"
          placeholder="Key"
          outlined
          dense
        ></v-text-field>
        <v-btn
          class="my-2"
          rounded
          color="primary"
          max-width="180"
          height="50"
          @click="handleAddAPI"
        >
          Registrar API
        </v-btn>
        <v-dialog v-model="loading" persistent width="300">
          <v-card color="primary" dark>
            <v-card-text>
              <v-card-title class="px-0 text-subtitle-1">
                Comprobando datos, por favor espera
              </v-card-title>
              <v-progress-linear
                indeterminate
                color="white"
                class="mb-0"
              ></v-progress-linear>
            </v-card-text>
          </v-card>
        </v-dialog>
      </v-card>
    </v-col>
  </v-row>

</template>
<script>
import api from '../utils/axios';
import 'filepond/dist/filepond.min.css';

export default {
  name: 'VpressApiDataset',
  data() {
    return {
      page: 0,
      perPage: 'all',
      q: '',
      loading: false,
      apiName: null,
      apiKey: null,
      apiPrefix: null,
      datasetName: null,
      datasetSlug: null,
      datasetAPI: null,
      formHasErrors: false,
      extAPIItems: []
    };
  },
  computed: {
    php_vars() {
      // eslint-disable-next-line no-undef
      return php_vars;
    },
    apiForm() {
      return {
        apiName: this.apiName,
        apiPrefix: this.apiPrefix,
        apiKey: this.apiKey
      }
    }
  },
  mounted() {
    this.getAPIs();
  },
  methods: {
    async getAPIs() {
      try {
        this.loading = true
        const obj = {
          page: this.page,
          itemsPerPage: this.perPage,
          q: this.query
        }
        const { data } = await api.externalAPI.list(obj);
        console.log(data);
        this.extAPIItems = data.data
        console.log(this.extAPIItems);
        this.total = data.total
        this.loading = false
      } catch (error) {
        this.$store.dispatch('notifications/open', {
          color: 'error',
          text: 'Hubo un error al intentar obtener el listado de APIs'
        })
        this.loading = false
      }
    },
    async handleAddDataset() {
      this.loading = true;
      try {
        console.log(this.datasetAPI);
        await api.dataset.create({
          name: this.datasetName,
          slug: this.datasetSlug,
          permissions: "public",
          owner_id: window.userSettings.uid,
          api_id: this.datasetAPI
        })
        this.$store.dispatch('notifications/open', {
          color: 'success',
          text: 'Dataset guardado con éxito'
        })
        this.$store.dispatch('notifications/open', {
          color: 'success',
          text: 'Dataset añadido con éxito',
        });
        this.loading = false;
      } catch (error) {
        this.$store.dispatch('notifications/open', {
          color: 'error',
          text: 'Hubo un error al intentar añadir el dataset',
        });
        this.loading = false;
      }
    },
    async handleAddAPI() {
      this.loading = true;
      try {
        const createRes = await api.externalAPI.create({
          apiName: this.apiName,
          apiKey: this.apiKey,
          apiPrefix: this.apiPrefix
        });
        console.log(createRes);
        this.$store.dispatch('notifications/open', {
          color: 'success',
          text: 'API añadida con éxito',
        });
        this.loading = false;
      } catch (error) {
        this.$store.dispatch('notifications/open', {
          color: 'error',
          text: 'Hubo un error al intentar añadir la API',
        });
        this.loading = false;
      }
    }
  },
};
</script>
