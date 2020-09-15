import axios from 'axios'

const instance = axios.create(
  { baseURL: process.env.VUE_APP_API_URL_DOMAIN }
)

const dataset = {
  list: () => instance.get(`/wp-json/vpress/v1/dataset/list`),
  get: params => instance.get('', { params }),
  info: ({ column, value }) => instance.get(
    `/wp-json/vpress/v1/dataset/info/${column}/${value}`
  ),
  data: ({ dataset, page, perPage }) => instance.get(
    `/wp-json/vpress/v1/dataset/${dataset}/?page=${page}&perPage=${perPage}`
  )
}

const chart = {
  list: ({ page, itemsPerPage, q }) => instance.get(
    `/wp-json/vpress/v1/chart/list/?page=${page}&perPage=${itemsPerPage}&q=${q}`
  ),
  get: chartId => instance.get(`/wp-json/vpress/v1/chart/get/${chartId}`),
  create: body => instance.post(`/wp-json/vpress/v1/chart/create`, body),
  update: body => instance.post(`/wp-json/vpress/v1/chart/update`,  body ),
  query: query => instance.post(`/wp-json/vpress/v1/chart/query`, query),
  delete: body => instance.delete(`/wp-json/vpress/v1/chart/delete`, body)
}

export default {
  dataset,
  chart
}