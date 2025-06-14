"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Wifi, WifiOff, QrCode, Copy, Check, Zap, ArrowLeftRight } from 'lucide-react';
import { DEFAULT_AVATAR_SVG_DATA_URI } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import * as p2pService from '@/lib/p2p';
import { PairedUser } from '@/types';

export default function P2PConnectionPage() {
  const { userProfile, addPairedUser, pairedUsers, isInitialized, createOrGetChat } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('create');
  const [connectionData, setConnectionData] = useState('');
  const [peerData, setPeerData] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  
  // Initialize P2P and set up event listeners
  useEffect(() => {
    if (!userProfile) return;

    // Initialize P2P system with current user ID
    p2pService.initializeP2P(userProfile.userId);
    
    // Listen for connection changes
    const connectionHandler = p2pService.onConnectionChange((info) => {
      if (info.connected) {
        // Connection established
        setConnectedPeers(p2pService.getConnectedPeers());
        setIsConnecting(false);
        
        // Create a pairedUser for the new connection
        const newPairedUser: PairedUser = {
          userId: info.userId,
          displayName: `Device ${info.userId.substring(0, 5)}`,
          avatar: DEFAULT_AVATAR_SVG_DATA_URI,
        };
        
        // Add to paired users
        addPairedUser(newPairedUser);
        
        toast({
          title: "P2P Connection Established!",
          description: "You can now send messages without internet",
        });
      } else {
        // Connection lost
        setConnectedPeers(prev => prev.filter(id => id !== info.userId));
      }
    });
    
    // Clean up event listeners on component unmount
    return () => {
      connectionHandler();
    };
  }, [userProfile, toast, addPairedUser]);

  useEffect(() => {
    if (isInitialized && !userProfile) {
      router.replace('/onboarding');
    }
  }, [userProfile, router, isInitialized]);

  if (!isInitialized || !userProfile) {
    return <div className="flex items-center justify-center h-full"><Zap className="h-16 w-16 animate-pulse text-primary" /></div>;
  }

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

  // Start chat with connected peer
  const startChat = (userId: string) => {
    const peer = pairedUsers.find(user => user.userId === userId);
    if (!peer) return;
    
    const chat = createOrGetChat(peer.userId, peer.displayName, peer.avatar);
    router.push(`/chat/messages/${chat.chatId}`);
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-6 space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <ArrowLeftRight className="mr-3 text-primary"/>
            Connect Without Internet
          </CardTitle>
          <CardDescription>
            Connect your device directly to another device and send messages without internet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="create">Create Connection</TabsTrigger>
              <TabsTrigger value="accept">Accept Connection</TabsTrigger>
            </TabsList>
            
            <TabsContent value="create" className="space-y-4 mt-4">
              <Button 
                onClick={handleCreateConnection}
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <Zap className="mr-2 h-4 w-4 animate-spin" />
                    Creating Connection...
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 h-4 w-4" />
                    Create Connection
                  </>
                )}
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
                    Paste this data on another device to connect
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="accept" className="space-y-4 mt-4">
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
                {isConnecting ? (
                  <>
                    <Zap className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wifi className="mr-2 h-4 w-4" />
                    Connect
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
          
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg flex-grow flex flex-col min-h-0">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <Wifi className="mr-3 text-primary"/>
            Connected Devices
          </CardTitle>
          <CardDescription>
            Your directly connected devices will appear here. Click on any device to start a chat.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden">
          {pairedUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
              <WifiOff className="h-16 w-16 text-muted-foreground" />
              <p className="text-muted-foreground">No devices connected</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Use the options above to connect with another device
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full max-h-[300px] pr-3">
              <ul className="space-y-3">
                {pairedUsers.map((user) => (
                  <li 
                    key={user.userId} 
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-md hover:bg-muted/60 cursor-pointer"
                    onClick={() => startChat(user.userId)}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.displayName}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[180px]">ID: {user.userId}</div>
                      </div>
                    </div>
                    
                    <Badge variant={connectedPeers.includes(user.userId) ? "default" : "outline"}>
                      {connectedPeers.includes(user.userId) ? (
                        <span className="flex items-center gap-1"><Wifi className="h-3 w-3" /> Online</span>
                      ) : (
                        <span className="flex items-center gap-1"><WifiOff className="h-3 w-3" /> Offline</span>
                      )}
                    </Badge>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-xs text-muted-foreground text-center">
            Both devices need to be on the same local network for P2P connection
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
