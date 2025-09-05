// DevAtlas Billing Page
// Created by Balaji Koneti

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Download, Check, X } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function BillingPage() {
  const [isLoading, setIsLoading] = useState(false);

  // Fetch subscription data
  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: api.billing.getSubscription,
  });

  // Fetch invoices
  const { data: invoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: api.billing.getInvoices,
  });

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const result = await api.billing.createCheckoutSession({
        priceId: 'price_pro_plan',
        successUrl: `${window.location.origin}/billing?success=true`,
        cancelUrl: `${window.location.origin}/billing?canceled=true`,
      });
      
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      toast.error('Failed to start checkout process');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setIsLoading(true);
    try {
      const result = await api.billing.createCustomerPortal({
        returnUrl: window.location.origin,
      });
      
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      toast.error('Failed to open billing portal');
    } finally {
      setIsLoading(false);
    }
  };

  const currentPlan = subscription?.subscription?.items?.data?.[0]?.price?.nickname || 'Free';
  const status = subscription?.subscription?.status || 'active';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <CreditCard className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Manage your subscription and billing information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{currentPlan} Plan</h3>
              <p className="text-sm text-muted-foreground">
                {status === 'active' ? 'Active subscription' : 'Inactive subscription'}
              </p>
            </div>
            <Badge variant={status === 'active' ? 'default' : 'secondary'}>
              {status}
            </Badge>
          </div>
          
          <div className="flex space-x-2">
            <Button onClick={handleUpgrade} disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Upgrade Plan'}
            </Button>
            <Button variant="outline" onClick={handleManageBilling} disabled={isLoading}>
              Manage Billing
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Usage This Month</CardTitle>
          <CardDescription>
            Track your current usage and limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Repositories</span>
                <span className="text-sm text-muted-foreground">5 / 10</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '50%' }}></div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Analyses</span>
                <span className="text-sm text-muted-foreground">12 / 50</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '24%' }}></div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">API Calls</span>
                <span className="text-sm text-muted-foreground">1,234 / 5,000</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '25%' }}></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            Choose the plan that best fits your needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Plan */}
            <div className="border rounded-lg p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Free</h3>
                <p className="text-3xl font-bold">$0</p>
                <p className="text-sm text-muted-foreground">per month</p>
              </div>
              <ul className="space-y-2">
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">5 repositories</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">10 analyses per month</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Basic scoring</span>
                </li>
                <li className="flex items-center space-x-2">
                  <X className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-muted-foreground">API access</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full" disabled>
                Current Plan
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="border rounded-lg p-6 space-y-4 border-blue-500 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-600">Popular</Badge>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Pro</h3>
                <p className="text-3xl font-bold">$29</p>
                <p className="text-sm text-muted-foreground">per month</p>
              </div>
              <ul className="space-y-2">
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">50 repositories</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Unlimited analyses</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Advanced scoring</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">API access</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Priority support</span>
                </li>
              </ul>
              <Button className="w-full" onClick={handleUpgrade} disabled={isLoading}>
                {isLoading ? 'Processing...' : 'Upgrade to Pro'}
              </Button>
            </div>

            {/* Enterprise Plan */}
            <div className="border rounded-lg p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Enterprise</h3>
                <p className="text-3xl font-bold">$99</p>
                <p className="text-sm text-muted-foreground">per month</p>
              </div>
              <ul className="space-y-2">
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Unlimited repositories</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Unlimited analyses</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Custom scoring</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">SSO integration</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Dedicated support</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full">
                Contact Sales
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription>
            Download your recent invoices and receipts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invoices?.invoices?.slice(0, 5).map((invoice: any) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 border rounded">
                <div>
                  <p className="font-medium">
                    {new Date(invoice.created * 1000).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Invoice #{invoice.number}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="font-medium">
                    ${(invoice.amount_paid / 100).toFixed(2)}
                  </span>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
