
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label"; // Ensure Label is imported
import { useToast } from "@/hooks/use-toast";
import { OnboardingSchema, type OnboardingFormData } from "@/lib/schemas";
import { ThemeToggle } from '@/components/chat/ThemeToggle';
import { UserCog, Palette, Trash2, SettingsIcon, Zap } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DEFAULT_AVATAR_SVG_DATA_URI } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


export default function SettingsPage() {
  const { userProfile, setUserProfile, clearAllData, isInitialized } = useAppContext();
  const router = useRouter();
  const { toast } = useToast();

  const displayNameForm = useForm<OnboardingFormData>({
    resolver: zodResolver(OnboardingSchema),
    defaultValues: {
      displayName: userProfile?.displayName || "",
    },
  });

  useEffect(() => {
    if (isInitialized && !userProfile) {
      router.replace('/onboarding');
    } else if (userProfile) {
      displayNameForm.reset({ displayName: userProfile.displayName });
    }
  }, [userProfile, router, displayNameForm, isInitialized]);

  if (!isInitialized || !userProfile) {
    return <div className="flex items-center justify-center h-full"><Zap className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  function onSubmitDisplayName(data: OnboardingFormData) {
    if (userProfile) {
      setUserProfile({ ...userProfile, displayName: data.displayName, avatar: DEFAULT_AVATAR_SVG_DATA_URI });
      toast({ title: "Success", description: "Display name updated." });
    }
  }
  
  const handleResetData = () => {
    clearAllData();
    toast({ title: "Data Cleared", description: "All local data has been reset." });
    router.push('/onboarding');
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-6 space-y-6">
      <header className="pb-4 border-b">
        <h1 className="text-2xl font-headline font-semibold flex items-center">
          <SettingsIcon className="mr-3 text-primary" />Settings
        </h1>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center"><UserCog className="mr-3 text-primary"/>Profile</CardTitle>
          <CardDescription>Manage your display name. Your profile picture is a default icon.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Display Name Form */}
          <Form {...displayNameForm}>
            <form onSubmit={displayNameForm.handleSubmit(onSubmitDisplayName)} className="space-y-4">
              <FormField
                control={displayNameForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="bg-primary hover:bg-primary/90">Save Name</Button>
            </form>
          </Form>

          {/* Profile Picture Display (No Upload) */}
          <div className="space-y-2 pt-4 border-t">
             <Label>Profile Picture</Label> {/* Changed from FormLabel to Label */}
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={DEFAULT_AVATAR_SVG_DATA_URI} alt="Default User Avatar" />
                <AvatarFallback className="text-2xl">
                  {userProfile.displayName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
               <p className="text-sm text-muted-foreground">
                All users have a default profile icon.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>


      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center"><Palette className="mr-3 text-primary"/>Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the app.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p>Theme</p>
          <ThemeToggle />
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center"><Trash2 className="mr-3 text-destructive"/>Data Management</CardTitle>
          <CardDescription>Reset all local application data. This action is irreversible.</CardDescription>
        </CardHeader>
        <CardContent>
           <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Reset All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all your chats, paired users, and profile settings from this device.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetData} className="bg-destructive hover:bg-destructive/90">
                  Yes, reset data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
