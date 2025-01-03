import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "../ui/button"
import { getPosts } from "@/lib/actions/post.actions"
import {PostsType} from "@/lib/types.ts"
import {dateToLocaleString,truncateTitle} from "@/lib/utils.ts"
import {MoreVertical} from "lucide-react"


export default async function PostGrid() {

  const allPosts = await getPosts()

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <h2 className="mb-8 text-2xl font-bold">Latest Posts</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {allPosts.data.map((post: PostsType) => (
            <Card key={post.id} className="overflow-hidden">
              <CardContent className="p-0">
              <div className="relative h-48">
                <Image
                alt={post.title}
                className="object-cover"
                fill
                src={post.imageUrl}
                />
                <span className="absolute top-0 right-[-5] p-4 text-white"><MoreVertical className=""/></span>
              </div>
              <div className="p-4">
                <Badge className="mb-2 bg-primary-100 hover:bg-primary-200">
                {post.category}
                </Badge>
                <h3 className="mb-4 text-lg font-semibold">{truncateTitle(post.title,26)}</h3>
                <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage alt={post.user.firstName} src={post.user.imageUrl} />
                  <AvatarFallback>
                  {post.user.firstName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p className="font-medium">{post.user.firstName} {post.user.lastName}</p>
                  <p className="text-gray-500">{dateToLocaleString(post.createdAt)}</p>
                </div>
                </div>
              </div>
              </CardContent>
              <CardFooter className="p-4 mt-auto">
              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1">
                Read More
                </Button>
                <Button className="flex-1 hover:bg-primary-200 bg-primary-100">
                Join
                </Button>
              </div>
              </CardFooter>
            </Card>
            ))}
        </div>
      </div>
    </section>
  )
}

