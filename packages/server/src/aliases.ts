import path from 'path'
import { register } from 'tsconfig-paths'
import devConfig from '../tsconfig.json'
import prodConfig from '../tsconfig.build.json'
import { NODE_ENV } from './config'

const tsconfig = NODE_ENV === 'production' ? prodConfig : devConfig

register({
  baseUrl: path.join(__dirname, '../'),
  paths: tsconfig.compilerOptions.paths
})
