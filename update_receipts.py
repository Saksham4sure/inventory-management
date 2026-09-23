import re

files_to_update = [
    './client/src/pages/SalesPage.jsx',
    './client/src/pages/PurchasesPage.jsx',
    './client/src/pages/TransactionsPage.jsx'
]

for file_path in files_to_update:
    with open(file_path, 'r') as f:
        content = f.read()

    # Import ReceiptBill if not already imported
    if 'ReceiptBill' not in content:
        # find the last import
        imports = re.findall(r'^import .*;$', content, re.MULTILINE)
        if imports:
            last_import = imports[-1]
            content = content.replace(last_import, last_import + "\nimport ReceiptBill from '../components/common/ReceiptBill';")
    
    # We will replace the Modal contents. The modal starts with {/* Transaction Details Receipt Modal */}
    # We'll use a regex to capture it.
    
    pattern = re.compile(r'\{\/\* Transaction Details Receipt Modal \*\/\}(.*?)\<\/Modal\>', re.DOTALL)
    
    def replacer(match):
        modal_start = match.group(1)
        # find the start of <div className="space-y-3.5">
        inner_start = modal_start.find('<div className="space-y-3.5">')
        if inner_start == -1:
            return match.group(0)
        
        prefix = modal_start[:inner_start]
        
        replacement = prefix + """<div className="space-y-4">
            <ReceiptBill 
              transaction={selectedTxn} 
              business={business} 
              currency={currency} 
            />
            <div className="flex gap-2 pt-1 print-hide border-t border-zinc-100 dark:border-zinc-800 mt-4 pt-4">
              <Button
                variant="danger"
                size="sm"
                className="flex-1"
                onClick={(e) => handleDeleteTransaction(e, selectedTxn._id, selectedTxn.referenceNumber)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Record
              </Button>
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setSelectedTxn(null)}>
                Close
              </Button>
            </div>
          </div>
        )}"""
        return '{/* Transaction Details Receipt Modal */}' + replacement + '</Modal>'
        
    new_content = pattern.sub(replacer, content)
    
    with open(file_path, 'w') as f:
        f.write(new_content)
    
    print(f"Updated {file_path}")

