const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/clinical/InitialEvaluationModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// I need to find the `<Dialog open={isOpen} ...>` and remove the inner divs.
// It looks like this:
/*
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader ...>
*/

const oldReturn = `  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="p-6 border-b border-slate-100 flex-shrink-0 flex justify-between items-start">`;

const newReturn = `  if (!paciente) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} className="w-full max-w-4xl min-h-[600px] h-full flex flex-col max-h-[90vh] overflow-hidden">
          <DialogHeader className="p-6 border-b border-slate-100 flex-shrink-0 flex justify-between items-start">`;

content = content.replace(oldReturn, newReturn);

const oldClose = `          </DialogFooter>
        </div>
      </div>
    </Dialog>
  );
}`;

const newClose = `          </DialogFooter>
    </Dialog>
  );
}`;

content = content.replace(oldClose, newClose);

fs.writeFileSync(filePath, content);
console.log('Fixed modal layout!');
