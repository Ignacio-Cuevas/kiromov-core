const fs = require('fs');

let content = fs.readFileSync('src/components/agenda/ClinicalTimeGrid.tsx', 'utf-8');

// 1. Current Time Hook & Indicator
const hookInjection = `  const duracionPredet = duracionPredeterminada || 45;

  const [currentTime, setCurrentTime] = React.useState(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const isToday = (d: Date) => getFormattedLocalDate(d) === getFormattedLocalDate(currentTime);
  const currentMinutesFrom8am = (currentTime.getHours() - START_HOUR) * 60 + currentTime.getMinutes();
  const currentTopPos = (currentMinutesFrom8am / 60) * HOUR_HEIGHT;
`;

content = content.replace(/  const duracionPredet = duracionPredeterminada \|\| 45;/, hookInjection);

// 2. Linea indicadora de hora actual
const currentTimeLineHTML = `
                {/* Current Time Indicator */}
                {isToday(d) && currentMinutesFrom8am >= 0 && currentMinutesFrom8am <= HOURS_COUNT * 60 && (
                  <div 
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: \`\${currentTopPos}px\` }}
                  >
                    <div className="absolute w-2.5 h-2.5 bg-emerald-500 rounded-full -left-1.5 -top-[5px] animate-pulse"></div>
                    <div className="w-full border-t-2 border-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                  </div>
                )}
`;

content = content.replace(/\{renderCitasDelDia\(d\)\}/, `{renderCitasDelDia(d)}\n${currentTimeLineHTML}`);

// 3. Modificar el header para poner LUN, MAR y el circulo
const headerCodeRegex = /\{d\.toLocaleDateString\('es-CL', \{ weekday: 'short' \}\)\}\\n\s*<br \/>\\n\s*\{d\.getDate\(\)\}\\n\s*\{d\.toLocaleDateString\('es-CL', \{ month: 'short' \}\)\}/g;
// Actually let's just replace the header rendering part entirely.

const headerSearch = content.indexOf('<div className="flex bg-slate-50/90 border-b border-slate-200 sticky top-0 z-30 backdrop-blur-sm">');
if (headerSearch !== -1) {
  // Let's replace the whole header div until its closing
}

fs.writeFileSync('src/components/agenda/ClinicalTimeGrid.tsx', content);
