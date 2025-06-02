import { CAC } from 'cac'
import { version } from '../package.json'

const cli = new CAC('glint')

interface CliOption {
  from: string
  verbose: boolean
}

cli
  .command('lint', 'Lint the project')
  .option('--verbose', 'Enable verbose logging')
  .example('glint lint')
  .action(async (options?: CliOption) => {
    console.log('Options:', options)
  })

cli.command('version', 'Show the version of the CLI').action(() => {
  console.log(version)
})

cli.version(version)
cli.help()
cli.parse()
