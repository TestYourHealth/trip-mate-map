import React from 'react';
import { HelpCircle, MessageCircle, Mail, ExternalLink, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqs = [
  {
    question: 'How are fuel costs calculated?',
    answer: 'Fuel costs are calculated based on the distance of your trip, your vehicle\'s mileage (km/L), and the current fuel price you\'ve set in the Fuel Prices settings.'
  },
  {
    question: 'How accurate are the toll estimates?',
    answer: 'Toll estimates are approximate and based on average toll rates per kilometer. Actual toll costs may vary depending on the specific toll plazas on your route.'
  },
  {
    question: 'Can I use the app offline?',
    answer: 'The map requires an internet connection to load. However, once a route is calculated, the navigation instructions are stored locally and can be viewed offline.'
  },
  {
    question: 'How does GPS tracking work?',
    answer: 'GPS tracking uses your device\'s location services to show your real-time position on the map. You need to grant location permission for this feature to work.'
  },
  {
    question: 'Why are there multiple route options?',
    answer: 'We show alternative routes when available, including faster routes and those with less traffic. Each route shows estimated time and traffic conditions.'
  },
];

const Help = () => {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <HelpCircle className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Help & Support</h1>
          <p className="text-muted-foreground">Find answers and get assistance</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="font-medium text-foreground">Chat Support</p>
              <p className="text-xs text-muted-foreground">Get instant help</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="font-medium text-foreground">Email Us</p>
              <p className="text-xs text-muted-foreground">support@tripmate.app</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FAQs */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>Quick answers to common questions</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Useful Links */}
      <Card>
        <CardHeader>
          <CardTitle>Useful Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="ghost" className="w-full justify-between">
            Privacy Policy
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button variant="ghost" className="w-full justify-between">
            Terms of Service
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button variant="ghost" className="w-full justify-between">
            App Version: 1.0.0
            <ChevronRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Help;
