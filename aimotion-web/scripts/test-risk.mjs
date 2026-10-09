import { analyzeTextRisk } from '../src/lib/riskEngine.js';
const tests = [
 ['me quiero morir','critico'],['Quiero hacerme DAÑO','critico'],['me hago daño en los brazos','critico'],
 ['no quiero vivir más','critico'],['ya no quiero seguir viviendo','critico'],['voy a quitarme la vida','critico'],
 ['no quiero vivir con mis papás','null'],['me corto el pelo mañana','null'],['me muero de risa','null'],
 ['siento que me muero de vergüenza','null'],['escucho voces que nadie más oye','alto'],['oigo voces','alto'],
 ['mi hijo habló de suicidio','alto'],['estoy muy estresado por el examen','null'],['no puedo más con el trabajo','null'],
 ['quiero desaparecer','alto'],['me siguen todos los días','alto'],['quiero matar a mi ex','critico'],
 ['me siento triste','null'],['tengo ansiedad','null'],['siento que me voy a morir, no puedo respirar','alto'],
 ['seria mejor si no existiera','critico'],['todos estarían mejor sin mí','critico'],['ya no le veo sentido a mi vida','critico'],
];
let bad=0;
for (const [t,exp] of tests){ const r=analyzeTextRisk(t); const got=r?r.severity:'null'; if(got!==exp){bad++;console.log('FALLA:',t,'| esperado',exp,'| obtuvo',got, r?r.category:'');} }
console.log(bad===0?'TODOS OK ('+tests.length+')':bad+' fallas de '+tests.length);
