"use client";

import { useEffect, useState, useRef } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingSchema, type OnboardingFormData } from "@/lib/schemas";
import { useAppContext } from "@/contexts/AppContext";
import type { UserProfile, PairedUser, Message } from "@/types";
import { DEFAULT_AVATAR_SVG_DATA_URI } from "@/types";
import { v4 as uuidv4 } from 'uuid'; 

const TEST_BUDDY_ID = "test-buddy-001";
const TEST_BUDDY_DISPLAY_NAME = "Test Buddy";


export default function OnboardingPage() {
  const router = useRouter();
  const { setUserProfile, userProfile, addPairedUser, createOrGetChat, addMessage, pairedUsers, isInitialized } = useAppContext();
  const [isProcessingOnboarding, setIsProcessingOnboarding] = useState(false);
  const newUserProfileRef = useRef<UserProfile | null>(null);
  const [testBuddySetupAttempted, setTestBuddySetupAttempted] = useState(false);
  const [readyToNavigate, setReadyToNavigate] = useState(false);


  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(OnboardingSchema),
    defaultValues: {
      displayName: "",
      phoneNumber: "",
    },
  });

  useEffect(() => {
    if (isInitialized && userProfile && !isProcessingOnboarding && !readyToNavigate) {
      router.replace("/chat");
    }
  }, [userProfile, router, isProcessingOnboarding, isInitialized, readyToNavigate]);

  function onSubmit(data: OnboardingFormData) {
    if (isProcessingOnboarding) return; 
    setIsProcessingOnboarding(true);
    setTestBuddySetupAttempted(false); 
    setReadyToNavigate(false); 

    const userId = uuidv4();
    const inviteLink = `peerlink://invite/${userId}`;
    const createdUserProfile: UserProfile = {
      userId,
      displayName: data.displayName,
      phoneNumber: data.phoneNumber,
      inviteLink,
      avatar: DEFAULT_AVATAR_SVG_DATA_URI, 
    };
    
    newUserProfileRef.current = createdUserProfile; 
    setUserProfile(createdUserProfile); 
  }

  useEffect(() => {
    if (
      isProcessingOnboarding &&
      userProfile && // Ensure userProfile is set by the previous setUserProfile call
      newUserProfileRef.current &&
      userProfile.userId === newUserProfileRef.current.userId && // Confirm it's the new user profile
      !testBuddySetupAttempted
    ) {
      setTestBuddySetupAttempted(true); // Mark as attempted early

      const isTestBuddyGloballyPaired = pairedUsers.some(u => u.userId === TEST_BUDDY_ID);

      if (!isTestBuddyGloballyPaired) {
        const testBuddy: PairedUser = {
          userId: TEST_BUDDY_ID,
          displayName: TEST_BUDDY_DISPLAY_NAME,
          avatar: DEFAULT_AVATAR_SVG_DATA_URI, 
          // localDisplayName is not set for Test Buddy initially
        };
        addPairedUser(testBuddy);

        // createOrGetChat uses the displayName from PairedUser if localDisplayName is not set
        const chatWithTestBuddy = createOrGetChat(
          TEST_BUDDY_ID, 
          TEST_BUDDY_DISPLAY_NAME, 
          DEFAULT_AVATAR_SVG_DATA_URI
        );

        const welcomeMessage: Message = {
          messageId: uuidv4(),
          chatId: chatWithTestBuddy.chatId,
          senderId: TEST_BUDDY_ID, // Message from Test Buddy
          receiverId: userProfile.userId, // To the new user
          text: "Hello! I'm your Test Buddy. You can test sending messages to me. I won't reply, but you can see how messages look and if they are 'sent', 'delivered', and 'read'.",
          timestamp: Date.now(),
          status: 'read', // Since it's from the "buddy", assume it's read by the current user
        };
        addMessage(welcomeMessage);
      }
      
      // All setup related to Test Buddy is done
      setIsProcessingOnboarding(false); // Onboarding processing is complete
      newUserProfileRef.current = null; // Clear the ref
      setReadyToNavigate(true); // Now ready to navigate
    }
  }, [
    isProcessingOnboarding, 
    userProfile, 
    pairedUsers, 
    addPairedUser, 
    createOrGetChat, 
    addMessage, 
    testBuddySetupAttempted
  ]);

  useEffect(() => {
    if (readyToNavigate) {
      router.push("/chat");
    }
  }, [readyToNavigate, router]);
  
  // Reset testBuddySetupAttempted if userProfile becomes null (e.g., after data reset)
  useEffect(() => {
    if (!userProfile) {
      setTestBuddySetupAttempted(false);
    }
  }, [userProfile]);


  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-center text-primary">Welcome to PeerLink!</CardTitle>
          <CardDescription className="text-center">
            Let's get you set up for offline chatting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Choose a Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Alex_P2P" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enter Your Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., +911234567890" type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isProcessingOnboarding}>
                {isProcessingOnboarding ? "Setting up..." : "Get Started"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
