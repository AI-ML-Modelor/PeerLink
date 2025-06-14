"use client";

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Wifi, WifiOff, Copy, Check } from 'lucide-react';
import * as p2pService from '@/lib/p2p';
import { useAppContext } from '@/contexts/AppContext';

interface P2PConnectProps {
  userId?: string;
}

export default function P2PConnect({ userId }: P2PConnectProps) {
  const { toast } = useToast();
  const { userProfile } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  const [connectionData, setConnectionData] = useState('');
  const [peerData, setPeerData] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);

  // Initialize and subscribe to connection events
  useEffect(() => {
    if (!userProfile) return;
    
    p2pService.initializeP2P(userProfile.userId);
    
    // Connection change handler
    const unsubscribe = p2pService.onConnectionChange((info) => {
      if (info.connected) {
        setIsConnected(true);
        setConnectedPeers(p2pService.getConnectedPeers());
        setIsConnecting(false);
        
        toast({
          title: "P2P Connection Established",
          description: "You can now send messages without internet",
        });
      } else {
        setConnectedPeers(prev => prev.filter(id => id !== info.userId));
        if (p2pService.getConnectedPeers().length === 0) {
          setIsConnected(false);
        }
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [userProfile, toast]);

  // Auto-connect if userId is provided
  useEffect(() => {
    if (userProfile && userId && !isConnected && !p2pService.isConnectedToPeer(userId)) {
      // Check if we're already connected to this peer
      const autoConnectPeer = async () => {
        try {
          console.log(`Attempting automatic P2P connection to: ${userId}`);
          setIsConnecting(true);
          
          // Try to create a connection offer
          const offerData = await p2pService.createConnectionOffer();
          setConnectionData(offerData);
          
          // Store connection data for later use in dialog
          setConnectionData(offerData);
          
          // For a real implementation in a production app, we would use a signaling server
          // to exchange connection data between peers automatically
        } catch (err) {
          console.error("Auto-connect error:", err);
          setIsConnecting(false);
        }
      };
      
      autoConnectPeer();
    }
  }, [userProfile, userId, isConnected]);

  // Create connection handler
  const handleCreateConnection = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const offerData = await p2pService.createConnectionOffer();
      setConnectionData(offerData);
    } catch (err) {
      setError((err as Error).message);
      setIsConnecting(false);
    }
  };
  
  // Accept connection handler
  const handleAcceptConnection = async () => {
    if (!peerData.trim()) {
      setError('Please enter connection data');
      return;
    }
    
    setIsConnecting(true);
    setError(null);
    
    try {
      const success = await p2pService.acceptConnectionOffer(peerData);
      if (!success) {
        setError('Failed to establish connection');
        setIsConnecting(false);
      }
    } catch (err) {
      setError((err as Error).message);
      setIsConnecting(false);
    }
  };
  
  // Copy connection data to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(connectionData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        variant={isConnected ? "default" : "outline"}
        size="sm"
        className="flex items-center gap-1"
      >
        {isConnected ? (
          <>
            <Wifi className="h-4 w-4 text-green-500" />
            <span className="text-xs">P2P ({connectedPeers.length})</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span className="text-xs">P2P</span>
          </>
        )}
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>P2P Connection</DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create Connection</TabsTrigger>
              <TabsTrigger value="accept">Accept Connection</TabsTrigger>
            </TabsList>
            
            <TabsContent value="create" className="space-y-4">
              <div className="space-y-4">
                <Button 
                  onClick={handleCreateConnection}
                  disabled={isConnecting}
                  className="w-full"
                >
                  {isConnecting ? 'Creating Connection...' : 'Create Connection'}
                </Button>
                
                {connectionData && (
                  <div className="space-y-2">
                    <div className="border rounded-md p-2">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium">Connection Data</p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={copyToClipboard}
                          className="h-8 w-8 p-0"
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Textarea
                        readOnly
                        value={connectionData}
                        rows={5}
                        className="font-mono text-xs mt-2"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Share this data with another user
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="accept" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Please paste connection data here"
                    value={peerData}
                    onChange={(e) => setPeerData(e.target.value)}
                    rows={5}
                    className="font-mono"
                  />
                </div>
                
                <Button 
                  onClick={handleAcceptConnection}
                  disabled={isConnecting || !peerData.trim()}
                  className="w-full"
                >
                  {isConnecting ? 'Connecting...' : 'Accept Connection'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md">
              {error}
            </div>
          )}
          
          {connectedPeers.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Connected Users:</p>
              <div className="space-y-2">
                {connectedPeers.map(peerId => (
                  <div key={peerId} className="flex items-center gap-2 bg-muted p-2 rounded-md">
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{peerId}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 