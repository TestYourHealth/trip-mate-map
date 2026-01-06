import React, { useState } from 'react';
import { Key, MapPin, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface TokenInputProps {
  onSubmit: (token: string) => void;
}

const TokenInput: React.FC<TokenInputProps> = ({ onSubmit }) => {
  const [token, setToken] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      onSubmit(token.trim());
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="glass-panel rounded-3xl p-8 max-w-md w-full animate-slide-up">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center glow-effect">
            <MapPin className="w-8 h-8 text-primary" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-foreground text-center mb-2">
          Welcome to Trip Mate
        </h1>
        <p className="text-muted-foreground text-center text-sm mb-6">
          Plan your trips and calculate costs with precision
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Mapbox Access Token
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="pk.eyJ1..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Get your free token from{' '}
              <a 
                href="https://mapbox.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                mapbox.com <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          <Button 
            type="submit" 
            variant="glow"
            className="w-full"
            disabled={!token.trim()}
          >
            Start Planning
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <p>Your token is stored locally and never sent to our servers.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenInput;
