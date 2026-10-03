import { mount } from 'svelte'
import App from './App.svelte'
import './index.css'

const target = document.getElementById('root')!
mount(App, { target })
