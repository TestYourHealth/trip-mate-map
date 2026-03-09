import React, { useState, useMemo } from 'react';
import { Users, Plus, Trash2, Receipt, UserPlus, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Expense {
  id: string;
  label: string;
  amount: number;
}

interface BillSplitterProps {
  tripFuelCost?: number;
  tripTollCost?: number;
  tripTotalCost?: number;
}

const BillSplitter: React.FC<BillSplitterProps> = ({
  tripFuelCost = 0,
  tripTollCost = 0,
  tripTotalCost = 0,
}) => {
  const [persons, setPersons] = useState<string[]>(['You']);
  const [newPerson, setNewPerson] = useState('');
  const [customExpenses, setCustomExpenses] = useState<Expense[]>([]);
  const [newExpenseLabel, setNewExpenseLabel] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [includeTripCosts, setIncludeTripCosts] = useState(true);

  const addPerson = () => {
    const name = newPerson.trim();
    if (name && !persons.includes(name)) {
      setPersons([...persons, name]);
      setNewPerson('');
    }
  };

  const removePerson = (index: number) => {
    if (persons.length > 1) {
      setPersons(persons.filter((_, i) => i !== index));
    }
  };

  const addExpense = () => {
    const label = newExpenseLabel.trim();
    const amount = parseFloat(newExpenseAmount);
    if (label && amount > 0) {
      setCustomExpenses([...customExpenses, { id: Date.now().toString(), label, amount }]);
      setNewExpenseLabel('');
      setNewExpenseAmount('');
    }
  };

  const removeExpense = (id: string) => {
    setCustomExpenses(customExpenses.filter(e => e.id !== id));
  };

  const totalBill = useMemo(() => {
    const customTotal = customExpenses.reduce((sum, e) => sum + e.amount, 0);
    return (includeTripCosts ? tripTotalCost : 0) + customTotal;
  }, [customExpenses, includeTripCosts, tripTotalCost]);

  const perPersonShare = useMemo(() => {
    return persons.length > 0 ? Math.ceil(totalBill / persons.length) : 0;
  }, [totalBill, persons.length]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-accent/50 flex items-center justify-center">
          <Receipt className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-sm font-bold text-foreground">Bill Splitter</h3>
        <span className="ml-auto text-xs text-muted-foreground">{persons.length} person{persons.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Trip costs toggle */}
      {tripTotalCost > 0 && (
        <button
          onClick={() => setIncludeTripCosts(!includeTripCosts)}
          className={cn(
            "w-full flex items-center justify-between rounded-xl p-3 text-sm transition-colors border",
            includeTripCosts
              ? "bg-primary/10 border-primary/30 text-foreground"
              : "bg-muted/30 border-border text-muted-foreground"
          )}
        >
          <span className="flex items-center gap-2">
            <ShoppingBag className="w-3.5 h-3.5" />
            Trip Costs (Fuel ₹{tripFuelCost} + Toll ₹{tripTollCost})
          </span>
          <span className="font-semibold">₹{tripTotalCost}</span>
        </button>
      )}

      {/* Custom expenses list */}
      {customExpenses.length > 0 && (
        <div className="space-y-1.5">
          {customExpenses.map(expense => (
            <div key={expense.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
              <span className="text-sm text-foreground truncate">{expense.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">₹{expense.amount}</span>
                <button onClick={() => removeExpense(expense.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add expense */}
      <div className="flex gap-2">
        <Input
          placeholder="Expense (e.g. Food)"
          value={newExpenseLabel}
          onChange={e => setNewExpenseLabel(e.target.value)}
          className="h-9 text-sm flex-1"
          onKeyDown={e => e.key === 'Enter' && addExpense()}
        />
        <Input
          placeholder="₹"
          type="number"
          value={newExpenseAmount}
          onChange={e => setNewExpenseAmount(e.target.value)}
          className="h-9 text-sm w-20"
          onKeyDown={e => e.key === 'Enter' && addExpense()}
        />
        <Button variant="outline" size="icon-sm" onClick={addExpense} className="h-9 w-9 shrink-0">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Persons */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> People
        </p>
        <div className="flex flex-wrap gap-1.5">
          {persons.map((person, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-xs font-medium"
            >
              {person}
              {persons.length > 1 && (
                <button onClick={() => removePerson(i)} className="hover:text-destructive transition-colors ml-0.5">
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add person"
            value={newPerson}
            onChange={e => setNewPerson(e.target.value)}
            className="h-9 text-sm"
            onKeyDown={e => e.key === 'Enter' && addPerson()}
          />
          <Button variant="outline" size="icon-sm" onClick={addPerson} className="h-9 w-9 shrink-0">
            <UserPlus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary */}
      {totalBill > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Bill</span>
            <span className="font-semibold text-foreground">₹{totalBill}</span>
          </div>
          <div className="h-px bg-primary/20" />
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">Per Person</span>
            <span className="text-xl font-bold text-primary">₹{perPersonShare}</span>
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Split equally among {persons.length} {persons.length === 1 ? 'person' : 'people'}
          </p>
        </div>
      )}
    </div>
  );
};

export default BillSplitter;
