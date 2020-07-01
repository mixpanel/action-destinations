const { exec } = require('child_process')

exports.command = 'new-destination <slug>'

exports.describe = 'Create a new destination from a template.'

exports.builder = {
  slug: {
    describe: "Destination slug. E.g. 'my-destination'"
  },
  template: {
    alias: 't',
    describe: 'Template directory.',
    default: './templates/new-destination'
  }
}

exports.handler = async function (argv) {
  const { slug, template } = argv

  const path = `./destinations/${slug}/`

  console.log(`Copying template ${template} to ${path}`)

  exec(`cp -R ${template} ${path}`, (error, stdout, stderr) => {
    if (error) {
      throw new Error(`Failed to copy template: ${error.message}`)
    }
  })

  console.log(`Done! Be sure to update the destination name in ${path}destination.json`)
}
