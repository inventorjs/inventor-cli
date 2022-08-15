import figlet from 'figlet'
import chalk from 'chalk'

figlet.fonts((err, fonts) => {
    fonts.forEach((font) => {
	    console.log('=========>', font)
	    console.log(chalk.green(figlet.textSync('inventor', { font })))
	    console.log('')
	    return ;
    })	
})
