"use server"
import { auth} from '@clerk/nextjs/server'
import {revalidatePath} from "next/cache"
import prisma from "@/lib/prisma";
import { Category } from "@prisma/client";

export type CreatePostParams = {
    title: string,
    description: string,
    category: string,
    image: string
}

export type UpdatePostParams = {
    postId: string
    title?: string
    description?: string
    category?: string
    image?: string
}

export type DashboardStats = {
    totalPosts: number;
    joinedProjects: number;
    pendingRequests: number;
    pendingPosts: number;
}

export type DashboardResponse = {
    success: boolean;
    data?: DashboardStats;
    error?: string;
}


export async function createPost({title,description,category,image}: CreatePostParams){
    
    try {

        const {userId} = await auth()
        if(!userId){
            throw new Error("Unauthorized: Must be logged in to create a post")
        }

        // user from db
        const user = await prisma.user.findUnique({
            where: {clerkUserId: userId}
        })
        if (!user){
            throw new Error("User not found")
        }
        // create post
        
        const post = await prisma.post.create({
            data:{
                title,
                description,
                category: category as Category,
                imageUrl: image,
                userId: user.id,
            }
        })

        revalidatePath('/hub')
        return {success: true, data: post, message: "Post created successfully"}

    } catch (error) {
        console.error("Error creating post : ", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to create post"
        }
    }
}

export async function getPost(postId: string){
    
    try{
        const {userId} = await auth()
        if(!userId){
            throw new Error("Unauthorized: You must be logged in to view post")
        }

        const post = await prisma.post.findUnique({
            where: {id: postId},
            include:{
                user: true
            }
        })

        if(!post){
            throw new Error("Post not found")
        }
        return {success: true, data: post}
    }catch(error){
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to get post"
        }
    }
    
}

export async function getPosts(page: number = 1, limit: number = 9) {
    try {
      const skip = (page - 1) * limit
      const posts = await prisma.post.findMany({
        include: { user: true },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip
      })
  
      const total = await prisma.post.count()
  
      return {
        success: true,
        data: posts,
        pagination: {
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          limit
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get posts"
      }
    }
  }

export async function updatePost({postId,title,description, category, image}: UpdatePostParams){
    try {
        const {userId} = await auth()
        if(!userId){
            throw new Error("Unauthorized: You must be logged in to update post")
        }

        //check if user owns the post
        const post = await prisma.post.findUnique({
            where: {id: postId},
            include:{user:true}
        })

        const user = await prisma.user.findUnique({
            where: {clerkUserId: userId}
        })

        if(!user || post?.userId !== user.id){
            throw new Error("Unauthorized: Can only update your own posts")
        }

        const updatedPost = await prisma.post.update({
            where: {id: postId},
            data:{
                ...(title && {title}),
                ...(description && {description}),
                ... (category && {category: category as Category}),
                ...(image && {imageUrl : image}),
                updatedAt: new Date()
            }
        })
        revalidatePath('/hub')
        return {success: true, data: updatedPost}
    } catch (error) {
        console.error("Error updating post : ", error)
        return {
            success: false,
            error: error instanceof Error ? error.message: "Failed to update post"
        }
    }
}

export async function deletePost(postId: string){
    try {
        const {userId} = await auth()
        if(!userId){
            throw new Error("Unauthorized: You must be logged in to delete post")
        }

        // check if user owns the post
        const post = await prisma.post.findUnique({
            where: {id: postId},
            include:{user:true}
        })
        if(!post){
            throw new Error("Post not found")
        }
        const user = await prisma.user.findUnique({
            where: {clerkUserId: userId}
        })

        if(!user || post.userId !== user.id){
            throw new Error("Unauthorized: Can only delete your own posts")
        }

        // delete post
        await prisma.post.delete({
            where: {id: postId}
        })

        revalidatePath('/hub')
        return {success: true, message: "Post deleted successfully"}
    } catch (error) {
        console.error("Error deleting post : ", error)
        return {
            success: false,
            error: error instanceof Error ? error.message: "Failed to delete post"
        }
    }
}

export async function getRandomPost() {
    try {
      const count = await prisma.post.count();
      // Generate random skip number
      const skip = Math.floor(Math.random() * count);
      
      // Get random post
      const post = await prisma.post.findFirst({
        skip,
        include: {
          user: true
        }
      });
  
      return { success: true, data: post };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get random post"
      }
    }
  }


export async function getDashboardStats(): Promise<DashboardResponse> {
    try {
        const {userId} = await auth()
        if(!userId) {
            throw new Error("Unauthorized: You must be logged in to view dashboard")
        }
        
        const user = await prisma.user.findUnique({
            where: {clerkUserId: userId}
        })
        
        if(!user) {
            throw new Error("User not found")
        }
        
        if (user.role === "admin") {
            const [totalPosts, pendingPosts, joinedProjects, pendingRequests] = await Promise.all([
                prisma.post.count(),
                prisma.post.count({
                    where: {status: 'pending'}
                }),
                prisma.joinList.count({
                    where: {status: 'approved'}
                }),
                prisma.joinList.count({
                    where: {status: 'pending'}
                })
            ]);
            
            return {
                success: true,
                data: {
                    totalPosts,
                    joinedProjects,
                    pendingRequests,
                    pendingPosts
                }
            }
        } else {
            const [totalPosts, pendingPosts, joinedProjects, pendingRequests] = await Promise.all([
                prisma.post.count({
                    where: {userId: user.id}
                }),
                prisma.post.count({
                    where: {userId: user.id, status: 'pending'}
                }),
                prisma.joinList.count({
                    where: {userId: user.id, status: 'approved'}
                }),
                prisma.joinList.count({
                    where: {userId: user.id, status: 'pending'}
                })
            ])
            
            return {
                success: true,
                data: {
                    totalPosts,
                    joinedProjects,
                    pendingRequests,
                    pendingPosts
                }
            }
        }
    } catch(error) {
        console.error("Error getting dashboard stats: ", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to get dashboard stats"
        }
    }
}

export async function updatePostStatus(postId: string, newStatus: 'approved' | 'not_approved') {
    try {
        const { userId } = await auth();
        
        if (!userId) {
            throw new Error("Unauthorized");
        }

        const user = await prisma.user.findUnique({
            where: { clerkUserId: userId }
        });

        if (!user || user.role !== 'admin') {
            throw new Error("Unauthorized: Admin access required");
        }

        await prisma.post.update({
            where: { id: postId },
            data: { status: newStatus }
        });

        revalidatePath('/dashboard/posts');
        
        return { success: true };
    } catch (error) {
        console.error('Error updating post status:', error);
        throw error;
    }
}

export const handleStatusChange = async (postId: string, newStatus: 'approved' | 'not_approved') => {
        
        const { userId } = await auth();
        if (!userId) {
            throw new Error("Unauthorized");
        }

        const user = await prisma.user.findUnique({
            where: { clerkUserId: userId }
        });

        if (!user || user.role !== 'admin') {
            throw new Error("Unauthorized");
        }

        await prisma.post.update({
            where: { id: postId },
            data: { status: newStatus }
        });
        revalidatePath("/dashboard/posts")
    };
    export const handleJoinStatusUpdate = async (joinId: string, newStatus: 'approved' | 'rejected') => {
        try {
            await prisma.joinList.update({
                where: { id: joinId },
                data: { status: newStatus }
            })
            
            revalidatePath('/dashboard/pending')
            return { success: true }
        } catch (error) {
            console.error('Error updating join status:', error)
            return { success: false }
        }
    }

    export const getPendingPosts = async () => {
        const { userId } = await auth();
        
        if (!userId) {
            throw new Error("Unauthorized");
        }
    
        const user = await prisma.user.findUnique({
            where: { clerkUserId: userId }
        });
    
        if (!user || user.role !== 'admin') {
            throw new Error("Unauthorized - Admin only");
        }
    
        const posts = await prisma.post.findMany({
            where: {
                status: 'pending'
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                user: true
            }
        });
    
        return posts;
    };


