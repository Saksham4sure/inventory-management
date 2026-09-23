import re

file_path = './client/src/pages/TransactionsPage.jsx'

with open(file_path, 'r') as f:
    content = f.read()

pattern = re.compile(r'\{\/\* Transaction Details Modal \*\/\}(.*?)\<\/Modal\>', re.DOTALL)

def replacer(match):
    modal_start = match.group(1)
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
                onClick={() => handleDeleteTransaction(selectedTxn._id, selectedTxn.referenceNumber)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Record
              </Button>
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setSelectedTxn(null)}>
                Close
              </Button>
            </div>
          </div>
        )}"""
    return '{/* Transaction Details Modal */}' + replacement + '</Modal>'
    
new_content = pattern.sub(replacer, content)

with open(file_path, 'w') as f:
    f.write(new_content)

print(f"Updated {file_path}")

